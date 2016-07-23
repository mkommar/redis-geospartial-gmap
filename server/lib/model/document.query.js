'use strict';

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    crypto = require( 'crypto' ),
    error = require( '../../error' ),
    CliTable = require( 'cli-table' ),
    colors = require( 'colors/safe' ),
    bignum = require( 'bignum' ),

    microtime = require( 'microtime' );

const plugins = {
    ix: require( './document.query.plugin.ix' ),
    sort: require( './document.query.plugin.sort' ),
    georadius: require( './document.query.plugin.georadius' ),
    // 'georadius.clustering': require( './document.query.plugin.georadius.clustering' ),
    geobbox: require( './document.query.plugin.geobbox' ),
    fulltext: require( './document.query.plugin.fulltext' )
};

class QueryChain {
    constructor( redis, model, query ) {
        // debug( 'QUERY', query );
        this.model = model;
        this.redis = redis;

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

        this.result = {
            ids: []
        };

        this.debug = debug;

        if( query.perfmon )
        {
            this.result.metrics = {
                execTimeUs: 0,
                hydrationTimeUs: 0
            };
        }
    }

    build( callback ) {
        async.series( [
            _.bind( this.select, this ),
            _.bind( this.range, this )
        ], err => {
            if( err ) return callback( err );
            callback( null, this );
        } )
    }

    tempStoreKey( stores ) {
        const str = _.isArray( stores ) ? stores.join( ' ' ) : stores,
            key = this.prefixes.temp + crypto.createHash( 'sha1' ).update( str ).digest( 'hex' );
        this.stores.tempKeys.push( key );
        return key;
    }

    queryTreeParser( cmd, level, callback ) {

        let zset = false; // first character of store type name, required for selecting result aggregation method

        /*
         * direct store input
         * example: [ 'sset|zset', 'store:key' ]
         */
        if( ~['sset', 'zset'].indexOf( cmd[0] ) )
        {
            zset |= cmd[0][0] === 'z';
            return callback( null, cmd[1] );
        }

        /*
         * check is there plugin for command
         * example: [ 'ix|georadius|fulltext', ... ]
         */
        if( plugins[cmd[0]] && plugins[cmd[0]].parse )
        {
            return plugins[cmd[0]].parse.bind( this )( cmd, level, ( err, key )=> {
                zset |= (key && key[0]) === 'z';
                return callback( null, key );
            } );
        }

        if( !~['union', 'inter', 'diff'].indexOf( cmd[0] ) )
        {
            return callback( new Error( `Undefined query command ${cmd}` ) );
        }

        /*
         * parse one level of tree (recursive call)
         * example: [ 'union|inter|diff', storeA, storeB, [sub level commands], ... ]
         */
        let stores = _.tail( cmd );

        async.map( stores, ( store, callback )=> {
            this.queryTreeParser( store, level + 1, callback );
        }, ( err, keys ) => {
            const prefix = zset ? 'z' : 's',
                op = cmd[0] === 'union' && (prefix + 'unionstore')
                    || cmd[0] === 'inter' && (prefix + 'interstore')
                    /* todo: zdiffstore is not exists */
                    || cmd[0] === 'diff' && (prefix + 'diffstore'),
                resultKey = this.tempStoreKey( keys ),
                aggregation = zset ? [op, resultKey, keys.length, ...keys] : [op, resultKey, keys];

            this.stack.push( aggregation );
            this.stores.tail.type = zset ? 'zset' : 'sset';
            callback( null, resultKey );
        } );
    }

    select( callback ) {
        if( this.query.select.length )
        {
            this.queryTreeParser( this.query.select, 1, ( err, key ) => {
                if( err ) return callback( err );
                this.stores.tail.key = key;
                callback();
            } );
        }
        else
        {
            this.stores.tail.key = [this.model.ns, 'index'].join( ':' ); // <- autoincrement only
            callback();
        }
    }

    range( callback ) {
        this.indexes.result = this.stack.length - 1;

        if( this.stores.tail.type === 'list' )
        {
            throw new Error( 'Not refactored' );
        }
        if( this.stores.tail.type === 'zrange' )
        {
            return callback();
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

        callback();
    }
}

class QueryExec {
    /**
     * @param redis
     * @param model
     * @param query
     * @param {QueryChain} queryChain
     */
    constructor( redis, model, query, queryChain ) {
        this.redis = redis;
        this.model = model;
        this.query = query;
        this.queryChain = queryChain;
        this.result = _.assign( {
            raw: [],
            ids: [],
            items: [],
            total: [],
            offset: query.limit && query.limit.offset || 0,
            count: query.limit && query.limit.count || 0
        }, queryChain.result );

        this.debug = debug;
    }

// массив ids где-то обнуляется
    exec( callback ) {
        // debug( `QUERY ${this.queryChain.stack.length} \n\t${_.map( this.queryChain.stack, ( v )=>v.join( ' ' ) ).join( '\n\t' )} \n`, `\n` );

        this.debug.table( {
            title: 'QUERY',
            head: ['ID', 'QUERY'],
            body: _.map( this.queryChain.stack, ( v, i )=>[i, v.join( ' ' )] )
        } );

        let timestamp = microtime.now();
        this.redis.batch( this.queryChain.stack ).exec( ( err, raw ) => {
            if( this.query.perfmon ) this.result.metrics.execTimeUs += microtime.now() - timestamp;
            if( err ) return callback( error.tag( err, '1468991389591' ) );
            // debug( `RAW RESULT \n\t${raw.join( '\n\t' )} \n`, `\n` );

            this.debug.table( {
                title: 'RAW RESULT',
                head: ['ID', 'RESPONSE'],
                body: _.map( raw, ( v, i ) => [i, v] )
            } );

            this.result.raw = raw;

            if( ~['sset', 'zset'].indexOf( this.queryChain.stores.tail.type ) )
            {
                this.result.ids = _.map( raw[this.queryChain.indexes.result + 1], _.unary( parseInt ) );
                this.result.total = raw[this.queryChain.indexes.result];
                if( !this.result.count ) this.result.count = this.result.total;
            }

            if( ~['zrange'].indexOf( this.queryChain.stores.tail.type ) )
            {
                this.result.ids = _.map( raw[this.queryChain.indexes.result], _.unary( parseInt ) );
                this.result.total = -1;
                if( !this.result.count ) this.result.count = this.result.total;
            }

            // if( ~['zrangescore'].indexOf( this.queryChain.stores.tail.type ) )
            // {
            //     // this.result.ids = _.map( raw[this.queryChain.indexes.result], _.unary( parseInt ) );
            //     this.result.ids = _.map( _.filter( raw[this.queryChain.indexes.result], ( n, i ) => i % 2 === 0 ), _.unary( parseInt ) );
            //     const hashes = _.filter( raw[this.queryChain.indexes.result], ( n, i ) => i % 2 === 1 );
            //     console.log(_.zip(hashes,_.map(hashes,hash => bignum( hash ).toBuffer())));
            //     this.result.total = -1;
            //     if( !this.result.count ) this.result.count = this.result.total;
            // }


            /* plugin's result handlers */
            _.forEach( _.filter( plugins, 'result' ), handler => _.bind( handler.result, this )() );

            this.hydrate( callback );

            /* not sure, but think that it's not required to wait for callback of cleanup routine */
            this.cleanup()
        } );
    }

    hydrate( callback ) {
        const chain = [];

        if( !this.query.idOnly )
        {
            chain.push( {
                order: 50,
                fn( callback ) {
                    debug( `HYDRATE LOAD_BY_IDS`, `\n` );
                    this.model.loadByIds( this.result.ids, ( err, items ) => {
                        if( err ) return callback( error.tag( err, '1468996084631' ) );
                        this.result.items = items;
                        callback();
                    } );
                }
            } );
        }

        /* push plugin's hydrate chain handler to hydrate chain */
        _.forEach( _.orderBy( plugins, 'order' ), plugin => plugin.hydrate && chain.push( plugin.hydrate ) );

        /* if handlers chain is empty then return result */
        if( !chain.length ) return callback( null, this.result );

        /* sort handlers by order */
        const waterfall = _.map( _.orderBy( chain, 'order' ), handler => _.bind( handler.fn, this ) );

        let timestamp = microtime.now();
        async.series( waterfall, ( err ) => {
            if( this.query.perfmon ) this.result.metrics.hydrationTimeUs += microtime.now() - timestamp;
            if( err ) return callback( error.tag( err, '1468993994327' ) );
            callback( null, this.result );
        } );
    }

    cleanup( callback ) {
        const query = _.map( this.queryChain.stores.tempKeys, key => ['del', key] );
        this.redis.batch( query ).exec( callback );
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
    new QueryChain( redis, model, query ).build( ( err, queryChain ) => {
        if( err ) return callback( error.tag( err, '1469034758295' ) );
        return new QueryExec( redis, model, query, queryChain ).exec( callback );
    } );
}


function debug( ...data ) {
    if( !process.env.DEBUG || !/document:query./.test( process.env.DEBUG ) ) return;
    console.log( ...data );
}

debug.table = function( {title, head, body} ) {
    if( !process.env.DEBUG || !/^document:query/.test( process.env.DEBUG ) ) return;
    const options = {};
    if( !_.isEmpty( head ) ) options.head = head;
    const table = new CliTable( options );
    table.push( ...body );
    console.info( `\n` );
    if( title ) console.log( colors.green.underline( title.toUpperCase() ) );
    console.info( table.toString() );
};

// debug.time = function( title ) {
//     debug.timestamp = Date.now();
//     if( !title || !debug.timestamp ) return;
//     console.info( `${title.toUpperCase()}: ${colors.cyan( Date.now() - debug.timestamp )}` );
// };

module.exports = query;