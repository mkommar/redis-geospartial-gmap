'use strict';

var async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    crypto = require( 'crypto' ),
    debug = require( 'debug' )( 'redis:document:query' ),
    error = require( '../../error' );

function getIndexValue( model, index, value ) {
    const field = model.schema.properties[index];
    if( !field ) throw new Error( `undefined index "${index}" of model ${model.name}` );
    if( field.model ) return Number( value.id || value );
    if( field.enum ) return field.enum.indexOf( value );
    return Number( value );
}

function tempStoreKey( options, stores ) {
    return options.prefix.temp + crypto.createHash( 'sha1' ).update( stores.join( ' ' ) ).digest( 'hex' );
}

const queryBuilder = {
    select: function( options ) {
        const queryStack = [];
        let type = 's';

        function queryRq( query, queryStack, level ) {
            let op = [],
                stores = _.tail( query );

            if( query.length === 1 )
            {
                return query[0];
            }

            if( query.length === 2 && !_.isArray( query[1] ) )
            {
                if( options.model.index && options.model.index.fulltext && ~options.model.index.fulltext.indexOf( query[0] ) )
                {
                    const fulltextKeys = options.model.fulltextSearchKeys( query[1] ),
                        resultKey = tempStoreKey( options, fulltextKeys );
                    if( fulltextKeys.length === 0 ) return;
                    type = 'z';
                    if( fulltextKeys.length === 1 ) return fulltextKeys[0];
                    queryStack.push( ['zinterstore', resultKey, fulltextKeys.length].concat( fulltextKeys ) );
                    return resultKey;
                }
                else
                {
                    return [options.prefix.index, query[0], getIndexValue( options.model, query[0], query[1] )].join( ':' );
                }
            }

            for( let i = 0; i < stores.length; i++ )
            {
                op.push( queryRq( stores[i], queryStack, level + 1 ) );
            }

            const targetKey = options.prefix.temp + crypto.createHash( 'sha1' ).update( op.join( ' ' ) ).digest( 'hex' );

            if( type === 'z' ) op.unshift( op.length );
            op.unshift( targetKey );
            op.unshift(
                query[0] === 'union' && (type + 'unionstore')
                || query[0] === 'inter' && (type + 'interstore')
                /* todo: zdiffstore is not exists*/
                || query[0] === 'diff' && (type + 'diffstore')
            );

            queryStack.push( op );

            return targetKey;
        }

        const resultStore = options.query.select.length
            ? queryRq( options.query.select, queryStack, 1 )
            : [options.model.ns, 'index'].join( ':' ); // <- autoincrement only

        return _.assign( {}, options, {
            stack: queryStack,
            store: resultStore,
            type: type + 'set'
        } );
    },
    order: function( options ) {
        if( !options.query.sortBy ) return options;

        const field = options.model.schema.properties[options.query.sortBy[0]];

        /* sort by string index */
        if( field.type === String )
        {
            const sortByStore = `${options.prefix.sortedString}:${options.query.sortBy[0]}`,
                order = options.query.order === 'desc' ? 'DESC' : 'ASC',
                offset = options.query.limit && Number( options.query.limit.offset ) || 0,
                limit = options.query.limit && Number( options.query.limit.count ) || -1,
                query = [
                    [`${options.type[0]}card`, options.store],
                    [
                        'sort', options.store, 'BY', `${sortByStore}:*`, 'ALPHA',
                        order,
                        'LIMIT', offset, limit
                    ]
                ];
            return _.assign( {}, options, {
                stack: _.concat( options.stack, query ),
                store: options.store,
                type: 'list'
            } );
        }
        /* sort by numeric index */
        else
        {
            const sortedStore = options.model.ns + ':index:' + options.query.sortBy[0],
                resultStore = options.prefix.temp
                    + crypto.createHash( 'sha1' ).update( [options.store, sortedStore].join( ' ' ) ).digest( 'hex' ),
                query = ['zinterstore', resultStore, 2, options.store, sortedStore, 'WEIGHTS', 0, 1];
            return _.assign( {}, options, {
                stack: _.concat( options.stack, [query] ),
                store: resultStore,
                type: 'zset'
            } );
        }
    },
    range: function( options ) {
        let query = [];
        if( options.type === 'list' )
        {
            return options;
        }
        if( options.type === 'zset' )
        {
            query = [
                ['zcard', options.store],
                [
                    options.query.order === 'desc' ? 'zrevrange' : 'zrange',
                    options.store,
                    options.query.limit ? Number( options.query.limit.offset ) : 0,
                    options.query.limit ? Number( options.query.limit.count ) + Number( options.query.limit.offset ) - 1 : -1
                ]
            ];
        }
        if( options.type === 'sset' )
        {
            query = [
                ['scard', options.store],
                ['smembers', options.store]
            ];
        }
        return _.assign( {}, options, {
            stack: _.concat( options.stack, query ),
            store: options.store,
            type: 'zset'
        } );
    }
};

function submodelsPick( opt, data, callback ) {
    callback( null, _.transform( data, function( result, val, key ) {
        opt[key] ? result[key] = _.pick( val, opt[key] ) : result[key] = val;
    }, {} ) );
}

function execQuery( redis, model, req, stack, callback ) {
    debug( `query \n ${_.map( stack, ( v )=>v.join( ' ' ) ).join( '\n' )} \n` );
    // console.log( `query \n ${_.map( stack, ( v )=>v.join( ' ' ) ).join( '\n' )} \n` );
    redis.batch( stack ).exec( function( err, res ) {
        if( err ) return callback( error.tag( err, '1459884073279' ) );
        debug( `result \n ${res.join( '\n' )} \n` );
        const ids = _.map( _.last( res ), _.unary( parseInt ) ),
            total = _.nth( res, -2 ),
            result = (_.isBoolean( req.query.list ) ? req.query.list : true) ? {
                items: ids,
                total: total,
                offset: req.query.limit && req.query.limit.offset || 0,
                count: req.query.limit && req.query.limit.count || total
            } : ids;

        if( req.query.idOnly ) return callback( null, req.group ? [req.group, result] : result );

        async.waterfall( _.compact( [
            async.constant( ids ),
            model.loadByIds,
            req.query.submodels ? _.partial( async.map, _, _.partial( model.loadSubModels2, req.query.submodels ) ) : null,
            req.query.submodelsPick ? _.partial( async.map, _, _.partial( submodelsPick, req.query.submodelsPick ) ) : null,
            model.events && model.events.afterLoad ? _.partial( async.map, _, model.events.afterLoad ) : null
        ] ), function( err, items ) {
            if( err ) return callback( err );
            const res = {
                ids: ids,
                items: items,
                total: total,
                offset: req.query.limit && req.query.limit.offset || 0,
                count: req.query.limit && req.query.limit.count || total
            };
            callback( null, req.group ? [req.group, res] : res );
        } );
    } );
}

function query( redis, model, query, callback ) {
    const common = {
        model: model,
        redis: redis,
        prefix: {
            index: model.ns + ':ix:s',
            sortedString: model.ns + ':ix:sstr',
            temp: model.ns + ':ix:t:'
        }
    };

    function groupQuery( groups, callback ) {
        async.map( groups, function( req, callback ) {
            const qa = _.chain( _.assign( {query: req.query}, common ) )
                .thru( queryBuilder.select )
                .thru( queryBuilder.order )
                .thru( queryBuilder.range )
                .value();
            execQuery( redis, model, req, qa.stack, callback );
        }, callback );
    }

    if( !query.select )
    {
        groupQuery( _.map( _.omit( query, ['batch'] ), ( v, k )=>({group: k, query: v}) ), function( err, res ) {
            if( err ) return callback( err );
            callback( null, _.fromPairs( res ) );
        } );
    }
    else
    {
        if( query.groupBy )
        {
            redis.zrange( [common.prefix.index, query.groupBy, 'index'].join( ':' ), 0, -1, function( err, res ) {
                if( err ) return callback( err );

                groupQuery( _.map( res, ( v )=>({
                    group: v,
                    query: _.assign( {}, query, {select: ['inter', [query.groupBy, v], query.select]} )
                }) ), function( err, res ) {
                    if( err ) return callback( err );
                    callback( null, _.fromPairs( res ) );
                } );
            } );
        }
        else
        {
            const qa = _.chain( _.assign( {query: query}, common ) )
                .thru( queryBuilder.select )
                .thru( queryBuilder.order )
                .thru( queryBuilder.range )
                .value();
            // console.log( _.map( qa.stack, ( v )=>v.join( ' ' ) ) );
            execQuery( redis, model, {query: query}, qa.stack, callback );
        }
    }
}

module.exports = query;