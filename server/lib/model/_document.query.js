'use strict';

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    crypto = require( 'crypto' ),
    debug = require( 'debug' )( 'redis:document:query' ),
    error = require( '../../error' ),
    geoClustering = require( './document.query.plugin.georadius.clustering' );

const plugins = {
    ix: require( './document.query.plugin.ix' ),
    sort: require( './document.query.plugin.sort' ),
    georadius: require( './document.query.plugin.georadius' ),
    fulltext: require( './document.query.plugin.fulltext' )
};

function getIndexValue( model, index, value ) {
    const field = model.schema.properties[index];
    if( !field ) throw new Error( `undefined index "${index}" of model ${model.name}` );
    if( field.model ) return Number( value.id || value );
    if( field.enum ) return field.enum.indexOf( value );
    return Number( value );
}

function tempStoreKey( prefix, stores ) {
    const str = _.isArray( stores ) ? stores.join( ' ' ) : stores;
    return prefix + crypto.createHash( 'sha1' ).update( str ).digest( 'hex' );
}

const queryBuilder = {
    select: function( options ) {
        const queryStack = [],
            indexes = {};
        let type = 's';

        function queryRq( query, queryStack, level ) {
            let op = [],
                stores = _.tail( query );

            if( query.length === 1 )
            {
                return query[0];
            }

            if( query[0] === 'georadius' )
            {
                const resultGeoKey = tempStoreKey( options.prefix.temp, options.keys.geo ),
                    resultIndexKey = tempStoreKey( options.prefix.temp, [resultGeoKey, options.keys.geo] ),
                    radius = query[3],
                    unit = query[4],
                    key = options.keys.geo;
                if( _.isArray( query[2] ) && query[2].length === 2 )
                {
                    const lng = query[2][0],
                        lat = query[2][1];

                    if( options.query.geo && options.query.geo.withDist )
                    {
                        queryStack.push( ['georadius', key, lng, lat, radius, unit, 'STOREDIST', resultGeoKey] );
                    }
                    else
                    {
                        queryStack.push( ['georadius', key, lng, lat, radius, unit, 'STORE', resultGeoKey] );
                    }
                }
                else if( _.isPlainObject( query[2] ) && query[2].id )
                {
                    if( options.query.geo && options.query.geo.withDist )
                    {
                        queryStack.push( ['georadiusbymember', key, query[2].id, radius, unit, 'STOREDIST', resultGeoKey] );
                    }
                    else
                    {
                        queryStack.push( ['georadiusbymember', key, query[2].id, radius, unit, 'STORE', resultGeoKey] );
                    }
                }
                else
                {
                    throw new Error( `Invalid query: ${query.toString()}` )
                }

                // output dist
                indexes.geo = queryStack.length;
                queryStack.push( ['zrange', resultGeoKey, 0, -1, 'WITHSCORES'] );
                // filter float ids
                queryStack.push( ['zinterstore', resultIndexKey, 2, resultGeoKey, options.keys.index] );

                type = 'z';
                return resultIndexKey;
            }

            if( query.length === 2 && !_.isArray( query[1] ) )
            {
                if( options.model.index && options.model.index.fulltext && ~options.model.index.fulltext.indexOf( query[0] ) )
                {
                    const fulltextKeys = options.model.fulltextSearchKeys( query[1] ),
                        resultKey = tempStoreKey( options.prefix.temp, fulltextKeys );
                    if( fulltextKeys.length === 0 ) return;
                    type = 'z';
                    if( fulltextKeys.length === 1 ) return fulltextKeys[0];
                    queryStack.push( ['zinterstore', resultKey, fulltextKeys.length].concat( fulltextKeys ) );
                    return resultKey;
                }
                else
                {
                    return [options.prefix.simple, query[0], getIndexValue( options.model, query[0], query[1] )].join( ':' );
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
            type: type + 'set',
            indexes
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
        let query = [],
            indexes = {};
        if( options.type === 'list' )
        {
            return options;
        }
        if( options.type === 'zset' )
        {
            query = _.compact( [
                _.last( options.stack )[0].indexOf( 'store' ) ? null : ['zcard', options.store],
                [
                    options.query.order === 'desc' ? 'zrevrange' : 'zrange',
                    options.store,
                    options.query.limit ? Number( options.query.limit.offset ) : 0,
                    options.query.limit ? Number( options.query.limit.count ) + Number( options.query.limit.offset ) - 1 : -1
                ]
            ] );
        }
        if( options.type === 'sset' )
        {
            query = [
                ['scard', options.store],
                ['smembers', options.store]
            ];
        }
        indexes.result = options.stack.length + query.length - 2;
        return _.assign( {}, options, {
            stack: _.concat( options.stack, query ),
            store: options.store,
            type: 'zset',
            indexes: _.assign( {}, options.indexes, indexes )
        } );
    }
};

/**
 * @class SteamPlayersSummariesV2
 * @type Object
 * @property {Array<SteamPlayerSummariesV2>} players
 */

/**
 * @param opt
 * @param data
 * @param callback
 */
function submodelsPick( opt, data, callback ) {
    callback( null, _.transform( data, function( result, val, key ) {
        opt[key] ? result[key] = _.pick( val, opt[key] ) : result[key] = val;
    }, {} ) );
}

function mapQueryGeoHashes( res ) {
    const geohashes = [];
    for( var i = 0; i < res.length / 2; i++ )
    {
        geohashes.push( {
            id: res[i * 2],
            hash: res[i * 2 + 1]
        } );
    }
    return geohashes;
}

function execQuery( redis, model, query, stack, indexes, callback ) {
    debug( `query \n ${_.map( stack, ( v )=>v.join( ' ' ) ).join( '\n' )} \n` );
    // console.log( `QUERY \n ${_.map( stack, ( v )=>v.join( ' ' ) ).join( '\n' )} \n` );

    redis.batch( stack ).exec( function( err, res ) {
        if( err ) return callback( error.tag( err, '1459884073279' ) );
        debug( `result \n ${res.join( '\n' )} \n` );
        // console.log( `RESULT \n\t${res.join( '\n\t' )} \n` );

        let ids = _.map( res[indexes.result + 1], _.unary( parseInt ) ),
            total = res[indexes.result];

        let result = (_.isBoolean( query.list ) ? query.list : true) ? {
                ids: ids,
                items: [],
                total: total,
                offset: query.limit && query.limit.offset || 0,
                count: query.limit && query.limit.count || total
            } : ids,
            geoInfo;

        if( query.geo && query.geo.withDist )
        {
            const geoCmd = _.find( stack, cmd => ~cmd[0].indexOf( 'georadius' ) );
            geoInfo = {
                distance: _.transform( _.chunk( res[indexes.geo], 2 ), ( dist, val ) => {
                    const id = Math.floor( val[0] ),
                        i = (id == val[0]) ? 0 : val[0].replace( id + '.', '' );
                    if( !dist[id] ) dist[id] = [];
                    dist[id][i] = val[1];
                }, {} ),
                radius: geoCmd[0] === 'georadius' ? geoCmd[4] : geoCmd[3],
                units: geoCmd[0] === 'georadius' ? geoCmd[5] : geoCmd[4]
            };

            result = _.assign( {}, result, {geo: geoInfo} );
        }

        if( query.geo && query.geo.clustering )
        {
            const geoCmd = _.find( stack, cmd => ~cmd[0].indexOf( 'georadius' ) );
            const geohashes = mapQueryGeoHashes( res[indexes.geo] ),
                radius = 'georadius' ? geoCmd[4] : geoCmd[3],
                units = geoCmd[0] === 'georadius' ? geoCmd[5] : geoCmd[4];
            result = geoClustering( result, geohashes, radius, units );
        }

        if( query.idOnly ) return callback( null, query.group ? [query.group, result] : result );

        fulfill( model, query, result, callback );
    } );
}

function fulfill( model, query, list, callback ) {
    async.waterfall( _.compact( [
        async.constant( list.ids ),
        model.loadByIds,
        query.submodels ? _.partial( async.map, _, _.partial( model.loadSubModels2, query.submodels ) ) : null,
        query.submodelsPick ? _.partial( async.map, _, _.partial( submodelsPick, query.submodelsPick ) ) : null,
        model.events && model.events.afterLoad ? _.partial( async.map, _, model.events.afterLoad ) : null
    ] ), function( err, items ) {
        if( err ) return callback( err );
        const result = _.assign( {}, list, {items: items} );
        callback( null, result );
    } );
}


class QueryChain {
    constructor( redis, model, query ) {
        this.redis = redis;
        this.model = model;

        this.keys = {
            index: model.ns + ':index',
            geo: model.ns + ':ix:gjs'
        };

        this.prefixes = {
            simple: model.ns + ':ix:s',
            // geo: model.ns + ':ix:geo',
            sortedString: model.ns + ':ix:sstr',
            temp: model.ns + ':ix:t:',
            geoDist: model.ns + ':ix:t:gd:'
        };


        this.stack = [];
        this.stores = {
            tail: {
                type: '',
                key: ''
            },
            tempKeys: []
        };
        this.indexes = {
            result: null
        };

        this.query = query;
    }

    build() {
        this.select();
        this.range();
        return this;
    }

    tempStoreKey( stores ) {
        const str = _.isArray( stores ) ? stores.join( ' ' ) : stores,
            key = this.prefixes.temp + crypto.createHash( 'sha1' ).update( str ).digest( 'hex' );
        this.stores.tempKeys.push( key );
        return key;
    }

    queryTreeParser( cmd, level ) {

        let zset = false; // first character of store type name, required for selecting result aggregation method

        /*
         * direct store input
         * example: [ 'sset|zset', 'store:key' ]
         */
        if( ~['sset', 'zset'].indexOf( cmd[0] ) )
        {
            zset |= cmd[0][0] === 'z';
            return cmd[1];
        }

        /*
         * check is there plugin for command
         * example: [ 'ix|georadius|fulltext', ... ]
         */
        if( plugins[cmd[0]] )
        {
            const store = plugins[cmd[0]].parse.bind( this )( cmd, level );
            zset |= store[0] === 'z';
            return store;
        }
        if( !~['union', 'inter', 'diff'].indexOf( cmd[0] ) ) throw new Error( `Undefined query command ${cmd}` );

        /*
         * parse one level of tree (recursive call)
         * example: [ 'union|inter|diff', storeA, storeB, [sub level commands], ... ]
         */
        let aggregation = [];
        let stores = _.tail( cmd );
        for( let i = 0; i < stores.length; i++ )
        {
            aggregation.push( this.queryTreeParser( stores[i], level + 1 ) );
        }

        const resultKey = this.tempStoreKey( aggregation );

        if( zset ) aggregation.unshift( aggregation.length );
        let prefix = zset ? 'z' : 's';
        aggregation.unshift( resultKey );
        aggregation.unshift(
            cmd[0] === 'union' && (prefix + 'unionstore')
            || cmd[0] === 'inter' && (prefix + 'interstore')
            /* todo: zdiffstore is not exists */
            || cmd[0] === 'diff' && (prefix + 'diffstore')
        );

        this.stack.push( aggregation );

        this.stores.tail.type = zset ? 'zset' : 'sset';
        return resultKey;
    }

    select() {
        this.stores.tail.key = this.query.select.length
            ? this.queryTreeParser( this.query.select, 1 )
            : [this.model.ns, 'index'].join( ':' ); // <- autoincrement only
    }

    range( options ) {
        // console.log( _.omit( this, ['model', 'redis'] ) );
        this.indexes.result = this.stack.length - 1;

        if( this.stores.tail.type === 'list' )
        {
            return options;
        }
        if( this.stores.tail.type === 'zset' )
        {
            if( !_.last( this.stack )[0].indexOf( 'store' ) )
            {
                this.stack.push( ['zcard', this.store] );
                this.indexes.result++;
            }
            this.stack.push( [
                this.query.order === 'desc' ? 'zrevrange' : 'zrange',
                this.stores.tail.key,
                this.query.limit ? Number( this.query.limit.offset ) : 0,
                this.query.limit ? Number( this.query.limit.count ) + Number( this.query.limit.offset ) - 1 : -1
            ] );
        }
        if( this.stores.tail.type === 'sset' )
        {
            this.stack.push( ['scard', this.stores.tail.key] );
            this.stack.push( ['smembers', this.stores.tail.key] );
            this.indexes.result++;
        }
    }
}


/**
 * @param redis
 * @param model
 * @param query
 * @param {Array} [query.select]
 * @param {String} [query.groupBy]
 * @param {String} [query.sortBy]
 * @param {String} [query.order]
 * @param {boolean} [query.idOnly]
 * @param {Object} [query.geo]
 * @param {boolean} [query.geo.clustering]
 * @param callback
 */
function query( redis, model, query, callback ) {
    const queryChain = new QueryChain( redis, model, query );

    const chain = queryChain.build();


    // console.log( _.omit( queryChain, ['model', 'redis'] ) );

    // console.log( `query \n\t${_.map( queryChain.stack, ( v )=>v.join( ' ' ) ).join( '\n\t' )} \n` );

    return execQuery( redis, model, query, chain.stack, chain.indexes, callback );


    const settings = {
        model: model,
        redis: redis,
        keys: {
            index: model.ns + ':index',
            geo: model.ns + ':ix:gjs'
        },
        prefix: {
            simple: model.ns + ':ix:s',
            // geo: model.ns + ':ix:geo',
            sortedString: model.ns + ':ix:sstr',
            temp: model.ns + ':ix:t:',
            geoDist: model.ns + ':ix:t:gd:'
        }
    };


    function groupQuery( groups, callback ) {
        async.map( groups, function( req, callback ) {
            const queryChain = prepareQueryChain( req.query, settings );
            execQuery( redis, model, req, queryChain.stack, queryChain.indexes, callback );
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
            redis.zrange( [settings.prefix.simple, query.groupBy, 'index'].join( ':' ), 0, -1, function( err, res ) {
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
            const queryChain = new QueryChain( redis, model, query );
            execQuery( redis, model, query, queryChain.stack, queryChain.indexes, callback );
        }
    }
}

module.exports = query;