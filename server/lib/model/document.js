'use strict';

/**
 * @constructor
 */
function ModelDocument() {}

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    crypto = require( 'crypto' ),
    debug = require( 'debug' )( 'lib:document' ),
    error = require( '../../error' ),
    modelUtil = require( '../model-util' ),
    modelSchema = require( '../model-schema' ),
    redisHelper = require( '../redis-helper' ),
    indexFulltext = require( './document.index.fulltext' ),
    AbstractModel = {};

_.mixin( AbstractModel, indexFulltext );

/**
 * @name ModelDocument#modelInit
 * @type {function}
 */



AbstractModel.modelInit = function( redis, model ) {
    model.schema.keys = {};

    model.schema.keys.all = _.chain( model.schema.properties )
        .omitBy( _.property( 'virtual' ) )
        .toPairs()
        .sortBy( ['[1].index'] )
        .map( _.property( '[0]' ) ).value();

    model.schema.keys.virtual = _.chain( model.schema.properties )
        .pickBy( _.property( 'virtual' ) )
        .keys()
        .value();

    model.schema.keys.loadHook = _.chain( model.schema.properties )
        .pickBy( _.property( 'onLoad' ) )
        .keys()
        .value();

    model.schema.keys.updatable = _.chain( model.schema.properties )
        .omitBy( _.property( 'virtual' ) )
        .pickBy( _.property( 'updatable' ) )
        .keys()
        .thru( _.partial( _.intersection, model.schema.keys.all ) )
        .value();

    model.schema.keys.submodel = _.chain( model.schema.properties )
        .pickBy( _.property( 'model' ) )
        .keys()
        .thru( _.partial( _.intersection, model.schema.keys.all ) )
        .value();

    model.schema.indexOf = function( property ) {
        return model.schema.keys.all.indexOf( property );
    };

    // deprecated
    model.jsonReplacements = model.jsonReplacements || {};

    model.scopes = _.transform( model.schema.properties, ( result, val, key )=> {
        if( !val.scope ) return '';
        const scope = [];
        scope.push( _.map( val.scope, v=>['model', model.name, 'read_' + v].join( '.' ) ) );
        scope.push( _.map( val.scope, v=>['model', model.name, 'write_' + v].join( '.' ) ) );
        scope.push( _.map( val.scope, v=>['model', model.name, key, 'write_' + v].join( '.' ) ) );
        scope.push( _.map( val.scope, v=>['model', model.name, key, 'write_' + v].join( '.' ) ) );
        result[key] = _.flatten( scope );
    }, {} );
    model.scopes.id = [
        ['model', model.name, 'read_private'].join( '.' ),
        ['model', model.name, 'read_public'].join( '.' )
    ];
};

/**
 * @name ModelDocument#loadSubModels
 * @param {object}      data
 * @param {function}    callback
 */
/** */
AbstractModel.loadSubModels = function( redis, model, data, callback ) {
    if( !model.schema.keys.submodel ) return callback( null, data );
    const exData = _.clone( data );
    async.forEach( model.schema.keys.submodel, function( propertyName, callback ) {
        const property = model.schema.properties[propertyName];
        if( !property.model || !property.autoload ) return callback();
        const val = data[propertyName],
            submodelId = _.isObject( val ) ? val.id : val;
        if( !submodelId ) return callback();
        property.model.getById( submodelId, function( err, subModel ) {
            if( err ) return callback( err );
            _.set( exData, propertyName, subModel );
            callback();
        } );
    }, function( err ) {
        if( err ) return callback( err );
        callback( null, exData );
    } );
};

AbstractModel.loadSubModels2 = function( redis, model, submodels, data, callback ) {
    const exData = _.clone( data );
    async.forEach( submodels, function( propertyName, callback ) {
        const property = model.schema.properties[propertyName];
        if( !property.model ) return callback();
        const val = data[propertyName],
            submodelId = _.isObject( val ) ? val.id : val;
        if( !submodelId ) return callback();
        property.model.getById( submodelId, function( err, subModel ) {
            if( err ) return callback( err );
            _.set( exData, propertyName, subModel );
            callback();
        } );
    }, function( err ) {
        if( err ) return callback( err );
        callback( null, exData );
    } );
};

AbstractModel.loadSubmodelsValues = function( redis, model, submodelValues, data, callback ) {
    callback( null, data );
    const exData = _.clone( data );
    async.forEach( _.toPairs( submodelValues ), function( submodel, callback ) {
        const propertyName = submodel[0];
        const property = model.schema.properties[propertyName];
        if( !property.model ) return callback();
        const val = data[propertyName],
            submodelId = _.isObject( val ) ? val.id : val;
        if( !submodelId ) return callback();
        property.model.getValues( submodelId, submodel[1], function( err, subModel ) {
            if( err ) return callback( err );
            _.set( exData, propertyName, subModel );
            callback();
        } );
    }, function( err ) {
        //if( err ) return callback( err );
        //callback( null, exData );
    } );
};

function getIndexValue( redis, model, index, value ) {
    const field = model.schema.properties[index];
    if( !field ) throw new Error( `undefined index "${index}" of model ${model.name}` );
    if( field.model ) return Number( value.id || value );
    if( field.enum ) return field.enum.indexOf( value );
    if( field.type === String ) return value;
    return Number( value );
}

AbstractModel.getIndexValue = function( redis, model, index, value ) {
    const field = model.schema.properties[index];
    if( !field ) throw new Error( `undefined index "${index}" of model ${model.name}` );
    if( field.model ) return Number( value.id || value );
    if( field.enum ) return field.enum.indexOf( value );
    if( field.type === String ) return value;
    return Number( value );
};

function getIndexValue2( model, index, value ) {
    const field = model.schema.properties[index];
    if( field.model ) return Number( value.id || value );
    if( field.enum ) return field.enum.indexOf( value );
    return Number( value );
}

AbstractModel.getDefaultEntity = function( redis, model ) {
    return _.transform( model.schema.keys.all, function( result, propertyName ) {
        const property = model.schema.properties[propertyName];
        if( _.isUndefined( property.default ) ) return;
        result[propertyName] = _.isFunction( property.default )
            ? property.default()
            : property.default;
    }, {} );
};

/**
 * @name ModelDocument#upsert
 * @param entity
 * @param callback
 */
/** */
AbstractModel.upsert = function( redis, model, entity, callback ) {
    async.waterfall( [
        function( callback ) {
            /* update */
            if( entity.id ) return callback( null, entity.id, true );
            /* insert with defined primary key */
            if( model.index && model.index.primary )
            {
                const primaryIndexValue = entity[model.index.primary].id || entity[model.index.primary];
                if( !primaryIndexValue ) return callback( error.code( 10, '1467761479480' ) );
                return redis.zscore( model.ns + ':primary', primaryIndexValue, function( err, id ) {
                    if( err ) return callback( error.tag( err, '1459111950365' ) );
                    callback( null, Number( id ), !!id );
                } );
            }
            /* insert with undefined primary key */
            if( !entity.id ) return callback( null, null, false );
        },
        function( id, exists, callback ) {
            /* update */
            if( exists ) return callback( null, id, exists );
            /* insert: update primary index */
            redis.incr( model.ns + ':counter', function( err, id ) {
                if( err ) return callback( error.tag( err, '1459111957551' ) );
                if( model.index && model.index.primary )
                {
                    const primaryIndexValue = entity[model.index.primary].id || entity[model.index.primary];
                    redis.batch( [
                        ['zadd', model.ns + ':primary', id, primaryIndexValue],
                        ['sadd', model.ns + ':index', id]
                    ] ).exec( function( err ) {
                        if( err ) return callback( error.tag( err, '1459111966815' ) );
                        callback( null, Number( id ), exists );
                    } );
                }
                else
                {
                    redis.sadd( model.ns + ':index', id, function( err ) {
                        if( err ) return callback( error.tag( err, '1459375089327' ) );
                        callback( null, Number( id ), exists );
                    } );
                }
            } );
        },
        function( id, exists, callback ) {
            /* update */
            if( exists )
            {
                const allowedFields = model.schema.keys.updatable;
                model.getById( id, function( err, modelData ) {
                    const processedData = _.assign( modelData, _.pick( entity, allowedFields ) );
                    callback( null, id, processedData, true );
                } );
            }
            /* insert */
            else
            {
                const allowedFields = model.schema.keys.all,
                    processedData = _.defaults( {id}, _.pick( entity, allowedFields ), model.getDefaultEntity() );
                callback( null, id, processedData, false );
            }
        },
        // process submodel fields
        function( id, processedData, update, callback ) {
            modelSchema.processSubModel( model.schema, processedData );
            callback( null, id, processedData, update );
        },
        // process onInsert, onUpdate hooks
        function( id, processedData, update, callback ) {
            modelSchema.processHook( model.schema, update ? 'onUpdate' : 'onInsert', processedData, function( err ) {
                if( err ) return callback( error.tag( err, '1459611717313' ) );
                callback( null, id, processedData, update );
            } );
        },
        function( id, processedData, update, callback ) {
            if( update )
            {
                let data = modelUtil.zipKeys( processedData, model.schema, model.jsonReplacements );
                redis.multi()
                    .del( model.ns + ':' + id )
                    .rpush( model.ns + ':' + id, data )
                    .exec( function( err ) {
                        if( err ) return callback( error.tag( err, '1463367506441' ) );
                        callback( null, id, processedData, update );
                    } );
            }
            else
            {
                let data = modelUtil.zipKeys( processedData, model.schema, model.jsonReplacements );
                redis.rpush( model.ns + ':' + id, data, function( err ) {
                    if( err ) return callback( error.tag( err, '1459113319430' ) );
                    callback( null, id, processedData, update );
                } );
            }
        },
        // process indexes
        function( id, processedData, update, callback ) {
            updateSortedIndex( redis, model, id, processedData, function( err ) {
                if( err ) return callback( error.tag( err, '1467730368009' ) );
                callback( null, id, processedData, update );
            } );
        },
        function( id, processedData, update, callback ) {
            updateSecondaryIndex( redis, model, id, processedData, function( err ) {
                if( err ) return callback( error.tag( err, '1461140493102' ) );
                callback( null, id, processedData, update );
            } );
        },
        function( id, processedData, update, callback ) {
            updateSimpleIndex( redis, model, id, processedData, function( err ) {
                if( err ) return callback( error.tag( err, '1461140493102' ) );
                callback( null, id, processedData, update );
            } );
        },
        function( id, processedData, update, callback ) {
            updateFullTextIndex( redis, model, id, processedData, function( err ) {
                if( err ) return callback( error.tag( err, '1461140493102' ) );
                callback( null, id, processedData, update );
            } );
        },
        function( id, processedData, update, callback ) {
            if( !update && _.isFunction( model.events && model.events.afterCreate ) )
            {
                return model.events.afterCreate( processedData, function( err ) {
                    if( err ) return callback( error.tag( err, '1461140493102' ) );
                    callback( null, id, processedData, update );
                } );
            }
            if( update && model.events && _.isFunction( model.events.afterUpdate ) )
            {
                return model.events.afterUpdate( processedData, function( err ) {
                    if( err ) return callback( error.tag( err, '1461140493102' ) );
                    callback( null, id, processedData, update );
                } );
            }
            callback( null, id, processedData, update );
        },
        function( id, processedData, update, callback ) {
            callback( null, id );
        }
    ], callback );
};

/**
 * @name ModelDocument#getById
 * @param {number} id
 * @param {function} callback
 * @callback {{
 *      err: Error,
 *      entity: Object
 * }}
 */
/** */
AbstractModel.getById = function( redis, model, id, callback ) {
    async.waterfall( [
        function( callback ) {
            redis.lrange( model.ns + ':' + id, 0, -1, function( err, list ) {
                if( err ) return callback( error.tag( err, '1459611298464' ) );
                if( _.isEmpty( list ) ) return callback( error.code( 11, '1459114777124' ) );
                const modelObject = modelUtil.unzipKeys( list, model.schema, model.jsonReplacements );
                callback( null, _.assign( modelObject, {id: Number( id )} ) );
            } );
        },
        function( modelData, callback ) {
            modelSchema.processHook( model.schema, 'onLoad', modelData, function( err ) {
                if( err ) return callback( error.tag( err, '1459611904301' ) );
                callback( null, modelData );
            } );
        },
        model.loadSubModels,
        function( item, callback ) {
            if( !model.events || !_.isFunction( model.events.afterLoad ) ) return callback( null, item );
            model.events.afterLoad( item, callback );
        }
    ], callback );
};

AbstractModel.loadSubmodel = function( redis, model, item, submodel, callback ) {
    if( !~model.schema.keys.submodel.indexOf( submodel ) ) return callback( null, item );
    const property = model.schema.properties[submodel],
        val = item[submodel];
    property.model.getById( _.isObject( val ) ? val.id : val, function( err, subModel ) {
        if( err ) return callback( err );
        _.set( item, submodel, subModel );
        callback( null, item );
    } );
};

/**
 * @name ModelDocument#getIdByPrimary
 * @param primary
 * @param callback
 */
/**
 */
AbstractModel.getIdByPrimary = function( redis, model, primary, callback ) {
    redis.zscore( model.ns + ':primary', primary.id || primary, function( err, id ) {
        if( err ) return callback( error.tag( err, '1459998593940' ) );
        if( !Number( id ) ) return callback( error.code( 11, '1459998704865' ) );
        callback( null, Number( id ) );
    } );
};

/**
 * @name ModelDocument#getByPrimary
 * @param primary
 * @param callback
 */
/** */
AbstractModel.getByPrimary = function( redis, model, primary, callback ) {
    async.waterfall( [
        _.partial( model.getIdByPrimary, primary ),
        model.getById
    ], callback );
};

AbstractModel.getValues = function( redis, model, id, keys, callback ) {
    const fields = _.map( keys, _.partial( modelUtil.decodeKey, _, model ) );
    if( !_.every( fields, v=>_.gte( v.index, 0 ) ) ) return callback( new Error( 'Field is not exists' ) );
    async.waterfall( [
        async.constant( fields ),
        function( fields, callback ) {
            redis.batch( _.map( fields, f=>['lindex', [model.ns, id].join( ':' ), f.index] ) ).exec( callback );
        },
        function( values, callback ) {
            return callback( null,
                _.chain( _.zip( keys, values ) )
                    .map( v=>[v[0], modelUtil.unzipKey( model.schema, v[0], v[1], model.jsonReplacements )] )
                    .fromPairs()
                    .value()
            );
        }
    ], callback );
};

AbstractModel.getValue = function( redis, model, id, key, callback ) {
    AbstractModel.getValues( redis, model, id, _.castArray( key ), function( err, res ) {
        if( err ) return callback( err );
        callback( null, res[key] );
    } );
};

AbstractModel.setValues = function( redis, model, id, keyValue, callback ) {
    //var field = modelUtil.decodeKey( key, model );
    //const fields = _.map( keyValue, ( v, k )=>modelUtil.decodeKey( k, model ) );
    //if( !_.every( fields, v=>_.gte( v.index, 0 ) ) ) return callback( new Error( 'Field is not exists' ) );
    //if( _.find( fields, ['virtual', true] ) ) return callback( new Error( '#setValue can not be called on virtual field' ) );

    //if( field.index < 0 ) return callback( new Error( 'Field is not exists' ) );
    //if( field.virtual ) return callback( new Error( '#setValue can not be called on virtual field' ) );

    //if( field.path === '' )
    //{
    const batch = _.transform( keyValue, function( result, value, key ) {
        const field = modelUtil.decodeKey( key, model );
        if( field.index < 0 ) return callback( new Error( 'field is not exists' ) );
        if( field.virtual ) return callback( new Error( '#setValue can not be called on virtual field' ) );
        const fieldValue = modelUtil.encodeProperty( field, value, model.jsonReplacements[field.name] ),
            indexValue = getIndexValue2( model, field.name, value );

        if( field.isIndexOfType.simple )
        {
            result.sindex.indexes.push( result.query.length );
            result.sindex.fields.push( field );
            result.sindex.prevIndexValue.push( indexValue );
        }
        result.query = result.query.concat( _.compact( [
            ['lindex', [model.ns, id].join( ':' ), field.index],
            ['lset', [model.ns, id].join( ':' ), field.index, fieldValue],
            field.isIndexOfType.sorted && ['zadd', [model.ns, 'index', field.name].join( ':' ),
                getIndexValue( redis, model, field.name, value ), id],
            field.isIndexOfType.simple && ['sadd', [model.ns, 'ix', 's', field.name, indexValue].join( ':' ), id],
            field.isIndexOfType.simple && ['zincrby', [model.ns, 'ix', 's', field.name, 'index'].join( ':' ), 1, indexValue]
        ] ) );
    }, {query: [], sindex: {indexes: [], fields: [], prevIndexValue: []}} );

    redis.batch( batch.query ).exec( function( err, res ) {
        if( err ) return callback( error.tag( err, '1463436949807' ) );
        const remIndex = _.zip( batch.sindex.fields, _.at( res, batch.sindex.indexes ), batch.sindex.prevIndexValue ),
            query = _.flatten( _.map( remIndex, ( ix )=> {
                const prevIndexValue = getIndexValue2( model, ix[0].name, ix[0].model ? JSON.parse( ix[1] ) : ix[1] );
                if( prevIndexValue === ix[2] ) return [];
                return [
                    ['srem', [model.ns, 'ix', 's', ix[0].name, prevIndexValue].join( ':' ), id],
                    ['zincrby', [model.ns, 'ix', 's', ix[0].name, 'index'].join( ':' ), -1, prevIndexValue]
                ]
            } ) );
        return redis.batch( query ).exec( callback );
    } );
    //}
    //else
    //{
    //    if( field.type !== Array && field.type !== Object ) return callback( new Error( 'Wrong type' ) );
    //    redisHelper( redis ).lock( model.ns + id + '#setValue' + _.upperFirst( field.name ), function( err, clearLock ) {
    //        model.getValue( id, field.name, function( err, res ) {
    //            var obj = _.isObject( res ) || _.isArray( res ) ? res : new field.type;
    //            if( value === _.get( obj, field.path ) ) return clearLock( callback );
    //            _.set( obj, field.path, value );
    //            const propertyValue = modelUtil.zipJson( obj, model.jsonReplacements[field.name] );
    //            redis.lset( [model.ns, id].join( ':' ), field.index, propertyValue, function( err ) {
    //                if( err ) return clearLock( ()=>callback( err ) );
    //                clearLock( callback );
    //            } );
    //        } );
    //    } );
    //}
};

AbstractModel.setValue = function( redis, model, id, key, value, callback ) {
    var field = modelUtil.decodeKey( key, model );

    if( field.index < 0 ) return callback( new Error( 'Field is not exists' ) );
    if( field.virtual ) return callback( new Error( '#setValue can not be called on virtual field' ) );

    if( field.path === '' )
    {
        const result = modelUtil.encodeProperty( field, value, model.jsonReplacements[field.name] ),
            indexValue = getIndexValue2( model, field.name, value );

        redis.batch( _.compact( [
            ['lindex', [model.ns, id].join( ':' ), field.index],
            ['lset', [model.ns, id].join( ':' ), field.index, result],
            field.isIndexOfType.sorted && ['zadd', [model.ns, 'index', field.name].join( ':' ),
                getIndexValue( redis, model, field.name, value ), id],
            field.isIndexOfType.simple && ['sadd', [model.ns, 'ix', 's', field.name, indexValue].join( ':' ), id],
            field.isIndexOfType.simple && ['zincrby', [model.ns, 'ix', 's', field.name, 'index'].join( ':' ), 1, indexValue]
        ] ) ).exec( function( err, res ) {
            if( err ) return callback( error.tag( err, '1463436949807' ) );
            if( field.isIndexOfType.simple )
            {
                const prevIndexValue = getIndexValue2( model, field.name, field.model ? JSON.parse( res[0] ) : res[0] );
                if( indexValue === prevIndexValue ) return callback();
                return redis.batch( [
                    ['srem', [model.ns, 'ix', 's', field.name, prevIndexValue].join( ':' ), id],
                    ['zincrby', [model.ns, 'ix', 's', field.name, 'index'].join( ':' ), -1, prevIndexValue]
                ] ).exec( callback );
            }
            callback();
        } );
    }
    else
    {
        if( field.type !== Array && field.type !== Object ) return callback( new Error( 'Wrong type' ) );
        redisHelper( redis ).lock( model.ns + id + '#setValue' + _.upperFirst( field.name ), function( err, clearLock ) {
            model.getValue( id, field.name, function( err, res ) {
                var obj = _.isObject( res ) || _.isArray( res ) ? res : new field.type;
                if( value === _.get( obj, field.path ) ) return clearLock( callback );
                _.set( obj, field.path, value );
                const propertyValue = modelUtil.zipJson( obj, model.jsonReplacements[field.name] );
                redis.lset( [model.ns, id].join( ':' ), field.index, propertyValue, function( err ) {
                    if( err ) return clearLock( ()=>callback( err ) );
                    clearLock( callback );
                } );
            } );
        } );
    }
};

AbstractModel.lock = function( redis, model, name, callback ) {
    redisHelper( redis ).lock( model.ns + ':lock:' + name, callback );
};

AbstractModel.getFieldBatch = function( redis, model, field, ids, callback ) {
    const query = _.map( ids, function( id ) {
        return ['lindex', model.ns + ':' + id, model.schema.indexOf( field )];
    } );
    redis.batch( query ).exec( callback );
};

AbstractModel.getFieldsBatch = function( redis, model, fields, ids, processHooks, callback ) {
    const query = _.map( ids, function( id ) {
        return _.map( fields, ( field )=>['lindex', model.ns + ':' + id, model.schema.indexOf( field )] );
    } );
    processHooks = processHooks || false;

    async.waterfall( [
        function( callback ) {
            redis.batch( _.flatten( query ) ).exec( function( err, res ) {
                if( err ) return callback( error.tag( err, '1459862381591' ) );
                const exFields = _.concat( fields, ['id'] ),
                    list = _.chain( res )
                        .chunk( fields.length )
                        .zipWith( ids, ( a, b )=> _.concat( a, b ) )
                        .map( ( item )=>_.zipObject( exFields, item ) )
                        .value();
                callback( null, list );
            } );
        },
        function( list ) {
            if( !processHooks ) return callback( null, list );
            async.forEach( _.intersection( fields, model.schema.keys.loadHook ), function( propertyName, callback ) {
                async.forEach( list, function( item, callback ) {
                    const property = model.schema.properties[propertyName];
                    if( !_.isFunction( property.onLoad ) ) return callback();
                    property.onLoad( item[propertyName], item, callback );
                }, callback );
            }, function( err ) {
                if( err ) return callback( err );
                callback( null, list );
            } );
        }
    ], callback );
};

/**
 * @name ModelDocument#loadByIds
 * @param ids
 * @param callback
 */
/** */
AbstractModel.loadByIds = function( redis, model, ids, callback ) {
    const query = _.map( ids, function( id ) {
        return ['lrange', model.ns + ':' + id, 0, -1];
    } );
    redis.batch( query ).exec( function( err, list ) {
        if( err ) return callback( error.tag( err, '1459123917809' ) );
        const items = _.chain( list )
            .map( _.partial( modelUtil.unzipKeys, _, model.schema, model.jsonReplacements ) )
            .map( ( item, index ) => _.assign( item, {id: ids[index]} ) )
            .value();

        async.forEach( items, function( item, callback ) {
            modelSchema.processHook( model.schema, 'onLoad', item, callback )
        }, function( err ) {
            if( err ) return callback( error.tag( err, '1459612746303' ) );
            callback( null, items );
        } );
    } );
};

function loadSubmodels( redis, model, list, callback ) {
    if( !model.schema.keys.submodel ) return callback( null, list );
    async.map( list, model.loadSubModels, callback );
}

function afterLoad( redis, model, list, callback ) {
    if( !model.events || !model.events.afterLoad ) return callback( null, list );
    async.map( list, model.events.afterLoad, callback );
}

AbstractModel.getAll = function( redis, model, callback ) {
    async.waterfall( [
        callback => redis.smembers( model.ns + ':index', function( err, res ) {
            if( err ) return callback( error.tag( err, '1459122084802' ) );
            callback( null, _.map( res, _.unary( parseInt ) ) );
        } ),
        model.loadByIds,
        _.partial( loadSubmodels, redis, model )
    ], callback );
};

/**
 * @param redis
 * @param model
 * @param options
 * @param options.index //['name',start,stop]
 * @param options.limit Object {offset: 0, count: 20, reverse: false}
 * @param options.orderBy String 'sorted'
 * @param callback
 */
AbstractModel.range = function( redis, model, options, callback ) {
    redis.zrange( [model.ns, 's', 'user', '1'].join( ':' ), 0, -1, function( err, res ) {
        if( err ) return callback( err );
        callback( null, _.map( res, _.unary( parseInt ) ) );
    } );

    //['zunionstore', tempStore, 1, indexKey],
    //    ['zremrangebyscore', tempStore, '-inf', start - 1],
    //    ['zremrangebyscore', tempStore, stop + 1, '+inf'],
    //    ['zinterstore', resultStore, 2, tempStore, sortedIndexStore, 'WEIGHTS', 0, 1],
    //    ['del', tempStore],
    //    [rev ? 'zrevrange' : 'zrange', resultStore, Number( offset ), Number( count + offset - 1 )]

    //async.waterfall( [
    //    function( callback ) {
    //        if( !options.index ) return callback( null, null );
    //        const enumValues = model.schema.properties[index].enum;
    //        if( !enumValues ) return callback( null, Number( start ), Number( stop ) );
    //        return callback( null, enumValues.indexOf( start ), enumValues.indexOf( stop ) );
    //    },
    //    function( start, stop, callback ) {
    //        const indexKey = [model.ns, 'index', index].join( ':' );
    //        redis.zrangebyscore( indexKey, start, stop, 'WITHSCORES', function( err, res ) {
    //            if( err ) return callback( error.tag( err, '1459605236551' ) );
    //            callback( null, _.map( _.filter( res, ( n, i ) => i % 2 === 0 ), _.unary( parseInt ) ) );
    //        } );
    //    }
    //], callback );
    //callback();
};

AbstractModel.rangeByIndex = function( redis, model, index, start, stop, callback ) {
    async.waterfall( [
        function( callback ) {
            const enumValues = model.schema.properties[index].enum;
            if( !enumValues ) return callback( null, Number( start ), Number( stop ) );
            return callback( null, enumValues.indexOf( start ), enumValues.indexOf( stop ) );
        },
        function( start, stop, callback ) {
            const indexKey = [model.ns, 'index', index].join( ':' );
            redis.zrangebyscore( indexKey, start, stop, 'WITHSCORES', function( err, res ) {
                if( err ) return callback( error.tag( err, '1459605236551' ) );
                callback( null, _.map( _.filter( res, ( n, i ) => i % 2 === 0 ), _.unary( parseInt ) ) );
            } );
        },
        model.loadByIds,
        _.partial( loadSubmodels, redis, model )
    ], callback );
};

/**
 * @name ModelDocument#query
 * @param query
 * @param callback
 */
/** */
AbstractModel.query = require( './document.query' );

AbstractModel.rangeByIndexLimit = function( redis, model, index, start, stop, offset, count, rev, callback ) {
    async.waterfall( [
        function( callback ) {
            const enumValues = model.schema.properties[index].enum;
            if( !enumValues ) return callback( null, Number( start ), Number( stop ) );
            return callback( null, enumValues.indexOf( start ), enumValues.indexOf( stop ) );
        },
        function( start, stop, callback ) {
            const indexKey = [model.ns, 'index', index].join( ':' );
            redis[rev ? 'zrevrangebyscore' : 'zrangebyscore']
            ( indexKey, rev ? stop : start, rev ? start : stop, 'WITHSCORES', 'LIMIT', offset, count, function( err, res ) {
                if( err ) return callback( error.tag( err, '1459605236551' ) );
                callback( null, _.map( _.filter( res, ( n, i ) => i % 2 === 0 ), _.unary( parseInt ) ) );
            } );
        },
        model.loadByIds,
        _.partial( loadSubmodels, redis, model )
    ], callback );
};

AbstractModel.rangeByIndexSortByLimit = function( redis, model, index, start, stop, offset, count, sorted, rev, callback ) {
    const indexKey = [model.ns, 'index', index].join( ':' ),
        sortedIndexStore = [model.ns, 'index', sorted].join( ':' ),
        tempStore = [model.ns, 'index:temp', index, start, stop, sorted].join( ':' ),
        resultStore = [model.ns, 'index:sorted', index, start, stop, sorted].join( ':' );

    async.waterfall( [
        function( callback ) {
            const enumValues = model.schema.properties[index].enum;
            if( !enumValues ) return callback( null, Number( start ), Number( stop ) );
            return callback( null, enumValues.indexOf( start ), enumValues.indexOf( stop ) );
        },
        function( start, stop, callback ) {
            redis.multi( [
                ['zunionstore', tempStore, 1, indexKey],
                ['zremrangebyscore', tempStore, '-inf', start - 1],
                ['zremrangebyscore', tempStore, stop + 1, '+inf'],
                ['zinterstore', resultStore, 2, tempStore, sortedIndexStore, 'WEIGHTS', 0, 1],
                ['del', tempStore],
                [rev ? 'zrevrange' : 'zrange', resultStore, Number( offset ), Number( count + offset - 1 )]
            ] )
                .exec( function( err, res ) {
                    if( err ) return callback( err );
                    callback( null, res[5] );
                } );
        },
        model.loadByIds,
        _.partial( loadSubmodels, redis, model ),
        _.partial( afterLoad, redis, model )
    ], callback );
};

AbstractModel.rangeBySecIndexLimit = function( redis, model, index, value, offset, count, rev, callback ) {
    async.waterfall( [
        function( callback ) {
            const indexKey = [model.ns, 's', index[0], value, index[1]].join( ':' );
            redis.zrevrange
            ( indexKey, Number( rev ? offset : -count - offset ), Number( rev ? count + offset - 1 : -offset ), function( err, res ) {
                if( err ) return callback( error.tag( err, '1459733949355' ) );
                callback( null, _.map( res, _.unary( parseInt ) ) );
            } );
        },
        model.loadByIds
    ], callback );
};

AbstractModel.repairIndexes = function( redis, model, callback ) {
    model.count( function( err, counter ) {
        const ids = _.range( 1, counter + 1 );
        async.forEachSeries( ids, function( id, callback ) {
            model.getById( id, function( err, item ) {
                if( !model.index ) return callback();
                async.forEachSeries( model.index.sorted, function( index, callback ) {
                    const field = model.schema.properties[index];
                    let indexValue;
                    if( field.model ) indexValue = item[index].id;
                    if( field.enum ) indexValue = field.enum.indexOf( item[index] );
                    if( _.isUndefined( indexValue ) ) indexValue = Number( item[index] );
                    if( !_.isFinite( indexValue ) ) return callback( error.tag( new Error( 'Not numeric index value' ), '1462721069925' ) );
                    redis.zadd( [model.ns, 'index', index].join( ':' ), indexValue, id, callback );
                }, callback );
            } );
        }, callback );
    } );
};

function updateSortedIndex( redis, model, id, entity, callback ) {
    if( !model.index ) return callback();
    if( !_.isArray( model.index.sorted ) || !model.index.sorted.length ) return callback();
    const query = _.map( model.index.sorted, function( property ) {
        const indexValue = model.getIndexValue( property, entity[property] );
        if( _.isFinite( indexValue ) )
        {
            return ['zadd', model.ns + ':index:' + property, indexValue, id];
        }
        if( _.isString( indexValue ) )
        {
            return ['set', `${model.ns}:ix:sstr:${property}:${id}`, indexValue];
        }
        return callback( error.tag( new Error( 'Invalid index' ), '1467729972645' ) );
    } );
    if( !_.compact( query ).length ) return callback( error.tag( new Error( 'Invalid index' ), '1467729982033' ) );
    redis.batch( query ).exec( function( err ) {
        if( err ) return callback( error.tag( err, '1467730223905' ) );
        callback();
    } );
}

function updateFullTextIndex( redis, model, id, entity, callback ) {
    if( !model.index ) return callback();
    if( !_.isArray( model.index.fulltext ) || !model.index.fulltext.length ) return callback();
    const query = _.map( model.index.fulltext, function( fieldName ) {
        if( !_.isString( entity[fieldName] ) ) return;
        return model.fulltextIndexQuery( id, entity[fieldName] );
    } );
    if( !_.compact( query ).length ) return callback( error.tag( new Error( 'Invalid index' ), '1467729982033' ) );
    redis.batch( _.flatten( query ) ).exec( function( err ) {
        if( err ) return callback( error.tag( err, '1467730223905' ) );
        callback();
    } );
}

function updateSecondaryIndex( redis, model, id, data, callback ) {
    if( !model.index ) return callback();
    if( !_.isObject( model.index.secondary ) || !_.keys( model.index.secondary ).length ) return callback();
    const query = _.reduce( model.index.secondary, function( result, sortedIndex, secondaryIndex ) {
        const sortedIndexValue = getIndexValue( redis, model, sortedIndex, data[sortedIndex] ),
            secondaryIndexValue = getIndexValue( redis, model, secondaryIndex, data[secondaryIndex] ),
            redisKey = [model.ns, 's', secondaryIndex, secondaryIndexValue, sortedIndex].join( ':' );
        if( _.isUndefined( secondaryIndexValue ) ) return;
        result.push( ['zadd', redisKey, sortedIndexValue, id] );
        return result;
    }, [] );
    redis.batch( query ).exec( function( err ) {
        if( err ) return callback( error.tag( err, '1459884073279' ) );
        callback();
    } );
}

function updateSimpleIndex( redis, model, id, data, callback ) {
    if( !model.index || !_.isArray( model.index.simple ) || !model.index.simple.length ) return callback();

    const query = _.reduce( model.index.simple, function( result, index ) {
        const indexValue = getIndexValue( redis, model, index, data[index] );
        if( _.isUndefined( indexValue ) ) return;
        result.push( ['sadd', [model.ns, 'ix', 's', index, indexValue].join( ':' ), id] );
        result.push( ['zincrby', [model.ns, 'ix', 's', index, 'index'].join( ':' ), 1, indexValue] );
        return result;
    }, [] );

    redis.batch( query ).exec( function( err ) {
        if( err ) return callback( error.tag( err, '1463055730460' ) );
        callback();
    } );
}

AbstractModel.rebuildSortedIndex = function( redis, model, callback ) {
    async.series( [
        callback => model.flushPath( `${model.ns}:index`, callback ),
        callback => model.flushPath( `${model.ns}:ix:sstr`, callback ),
        callback => model.count( function( err, counter ) {
            const ids = _.range( 1, counter + 1 );
            async.forEachSeries( ids, function( id, callback ) {
                model.getById( id, function( err, item ) {
                    updateSortedIndex( redis, model, id, item, callback );
                } );
            }, callback );
        } )
    ], callback );
};

AbstractModel.rebuildFulltextIndex = function( redis, model, callback ) {
    async.series( [
        callback => model.flushPath( `${model.ns}:ix:ft`, callback ),
        callback => model.count( function( err, counter ) {
            const ids = _.range( 1, counter + 1 );
            async.forEachSeries( ids, function( id, callback ) {
                model.getById( id, function( err, item ) {
                    updateFullTextIndex( redis, model, id, item, callback );
                } );
            }, callback );
        } )
    ], callback );
};

AbstractModel.rebuildSimpleIndexes = function( redis, model, callback ) {
    if( !model.index || !_.isArray( model.index.simple ) || !model.index.simple.length ) return callback();
    async.series( [
        callback => model.flushPath( `${model.ns}:ix:s:`, callback ),
        callback => model.count( function( err, counter ) {
            const ids = _.range( 1, counter + 1 );
            async.forEachSeries( ids, function( id, callback ) {
                model.getById( id, function( err, item ) {
                    updateSimpleIndex( redis, model, id, item, callback );
                } );
            }, callback );
        } )
    ], callback );
};

AbstractModel.repairSecondaryIndexes = function( redis, model, callback ) {
    model.count( function( err, counter ) {
        const ids = _.range( 1, counter + 1 );
        async.forEachSeries( ids, function( id, callback ) {
            model.getById( id, function( err, item ) {
                updateSecondaryIndex( redis, model, id, item, callback );
            } );
        }, callback );
    } );
};

AbstractModel.flush = function( redis, model, callback ) {
    model.flushPath( model.ns, callback );
};

AbstractModel.flushPath = function( redis, model, path, callback ) {
    let cursor = 0, initial = true;
    async.whilst(
        function() { return cursor != 0 || initial; },
        function( callback ) {
            initial = false;
            redis.scan( cursor, 'match', path + ':*', 'count', '100', function( err, res ) {
                cursor = res[0];
                redis.batch( _.map( res[1], key=>['del', key] ) ).exec( callback );
            } )
        },
        function( err ) {
            if( err ) return console.error( err );
            callback();
        }
    );
};

AbstractModel.count = function( redis, model, callback ) {
    redis.get( model.ns + ':counter', function( err, counter ) {
        if( err ) return callback( error.tag( err, '1459629662938' ) );
        callback( null, Number( counter ) );
    } );
};

AbstractModel.filterModelFields = function( redis, model, item, scope ) {
    _.forOwn( item, ( val, key )=> {
        if( !_.intersection( model.scopes[key], _.castArray( scope ) ).length ) _.unset( item, key );
    } );
};

function inject( redis, model ) {
    _.forOwn( AbstractModel, function( fn, method ) {

        if( !model.hooks ) return model[method] = _.partial( AbstractModel[method], redis, model );

        model[method] = function() {
            const args = _.toArray( arguments ),
                beforeHook = model.hooks['before' + _.upperFirst( method )],
                afterHook = model.hooks['after' + _.upperFirst( method )];

            if( beforeHook || afterHook )
            {
                const flow = [];
                flow.push( _.spread( async.constant )( _.initial( args ) ) );
                beforeHook && flow.push( beforeHook );
                flow.push( _.partial( AbstractModel[method], redis, model ) );
                afterHook && flow.push( afterHook );
                async.waterfall( flow, _.last( args ) );
            }
            else
            {
                _.spread( _.partial( AbstractModel[method], redis, model ) )( args )
            }
        };
    } );
    model.modelInit();
    return model;
}

module.exports = inject;
module.exports.inject = inject;