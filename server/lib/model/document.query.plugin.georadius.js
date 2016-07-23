'use strict';

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    bignum = require( 'bignum' ),
    ngeohash = require( '../ngeohash' ),
    uuid = require( 'node-uuid' ),
    microtime = require( 'microtime' );

function minBitDepth( precision ) {
    return 52 - 2 * Math.floor( Math.log2( 4 * precision ) );
}

function pointsToPolygon( points ) {
    return [
        [points[0][1], points[0][0]],
        [points[0][1], points[1][0]],
        [points[1][1], points[1][0]],
        [points[1][1], points[0][0]],
        [points[0][1], points[0][0]]
    ]
}

function parse( cmd, level, callback ) {
    level = -1;
    // if( cmd[0] === 'georadius' )

    const geoKey = this.tempStoreKey( this.keys.geo ),
        resultKey = this.tempStoreKey( [geoKey, this.keys.geo] ),
        [radius,units] = [cmd[3], cmd[4]],
        bitDepth = minBitDepth( radius / 4 ),
        keys = getKeys( this.model ),
        [lng,lat] = [cmd[2][0], cmd[2][1]];

    const tempKeys = _.times( 5, () => `${this.prefixes.temp}:${uuid.v4()}` );
    this.stores.tempKeys.push( ...tempKeys );

    const queryStack = [
        /*0*/['georadius', keys.groups( bitDepth ), lng, lat, radius, units, 'STORE', tempKeys[0]],
        /*1*/['zinterstore', tempKeys[1], 2, tempKeys[0], keys.counter( bitDepth ), 'WEIGHTS', 0, 1],
        /*2*/['zinterstore', tempKeys[2], 2, tempKeys[0], keys.points( bitDepth ), 'WEIGHTS', 0, 1],
        /*3*/['zrange', tempKeys[0], 0, -1, 'WITHSCORES'], // [group,geohash]
        /*4*/['zrange', tempKeys[1], 0, -1, 'WITHSCORES'], // [group,count]
        /*5*/['zrange', tempKeys[2], 0, -1, 'WITHSCORES']  // [group,id]
    ];

    this.debug.table( {
        title: 'QUERY GEORADIUS',
        head: ['ID', 'QUERY'],
        body: _.map( queryStack, ( v, i )=>[i, v.join( ' ' )] )
    } );

    let timestamp = microtime.now();
    this.redis.batch( queryStack ).exec( ( err, res ) => {
        if( this.query.perfmon ) this.result.metrics.execTimeUs += microtime.now() - timestamp;
        this.result.geo = {
            groups: [],
            total: 0,
            radius,
            units,
            bitDepth
        };

        let groups = {};

        for( let i = 0; i < res[0]; i++ )
        {
            _.set( groups, `[${res[3][i * 2]}].geohash`, res[3][i * 2 + 1] );
            _.set( groups, `[${res[4][i * 2]}].group`, res[4][i * 2] );
            _.set( groups, `[${res[4][i * 2]}].count`, res[4][i * 2 + 1] );
            _.set( groups, `[${res[5][i * 2]}].id`, res[5][i * 2 + 1] );
        }

        // const result = [];

        const result = _.transform( groups, ( result, {geohash, group, count, id} ) => {
            if( count == 1 )
            {
                this.result.ids.push( id );
                result.push( geohash );
                result.push( id );
                this.result.geo.total++;
                // const bbox = ngeohash.decode_bbox_int( geohash, 52 );

                // this.result.geo.bboxes.push( [[bbox[1], bbox[0]], [bbox[3], bbox[2]]] );
            }
            else
            {
                const coord = ngeohash.decode_int( geohash, 52 );
                const bbox = ngeohash.decode_bbox_int( group, bitDepth );
                this.result.geo.groups.push( {
                    groupId: group,
                    coordinates: [coord.longitude, coord.latitude],
                    total: Number( count ),
                    boundaryBox: [[bbox[1], bbox[0]], [bbox[3], bbox[2]]],
                    center: [([bbox[1] + bbox[3]]) / 2, ([bbox[0] + bbox[2]]) / 2]
                } );
                this.result.geo.total += Number( count );

                // const bbox = ngeohash.decode_bbox_int( group, bitDepth );
                // this.result.geo.bboxes.push( [[bbox[1], bbox[0]], [bbox[3], bbox[2]]] );

                // console.log( {
                //     geohash,
                //     point: ngeohash.decode_int( geohash, 52 ),
                //     bbox: bbox,
                //     bitDepth,
                //     radius, units,
                //     polygon: pointsToPolygon( _.chunk( bbox, 2 ) )
                // } );
            }
        }, [] );

        // groups = _.values( groups );
        // console.log( groups );


        // for( var i = 0; i < res[0]; i++ )
        // {
        //     // const [geohash,group,count,id] = [res[3][i * 2 + 1], res[4][i * 2], res[4][i * 2 + 1], res[5][i * 2 + 1]];
        //     const [geohash,group,count,id] = [groups[i].geohash, groups[i].group, groups[i].count, groups[i].id];
        //
        //
        // }

        if( result.length )
        {
            this.stack.push( ['zadd', tempKeys[3], ...result] );
            this.stores.tail.type = 'zset';
            callback( null, tempKeys[3] );
        }
        else
        {
            callback();
        }
    } );
    return;

    // /* georadius by lng,lat coordinates */
    // if( _.isArray( cmd[2] ) && cmd[2].length === 2 )
    // {
    //     const [lng,lat] = [cmd[2][0], cmd[2][1]];
    //
    //     if( this.query.geo && this.query.geo.withDist )
    //     {
    //         this.stack.push( ['georadius', keys.groups( bitDepth ), lng, lat, radius, unit, 'STOREDIST', geoKey] );
    //     }
    //     else
    //     {
    //         if( level > 1 )
    //         {
    //             this.stack.push( ['georadius', keys.groups( bitDepth ), lng, lat, radius, unit, 'STORE', geoKey] );
    //         }
    //         else
    //         {
    //             this.stack.push( ['georadius', keys.groups( bitDepth ), lng, lat, radius, unit, 'WITHHASH'] );
    //             this.indexes.geo = 0;
    //         }
    //     }
    // }

    // /* georadius by entity coordinates */
    // else if( _.isPlainObject( cmd[2] ) && cmd[2].id )
    // {
    //     if( this.query.geo && this.query.geo.withDist )
    //     {
    //         this.stack.push( ['georadiusbymember', keys.groups( bitDepth ), cmd[2].id, radius, unit, 'STOREDIST', geoKey] );
    //     }
    //     else
    //     {
    //         this.stack.push( ['georadiusbymember', keys.groups( bitDepth ), cmd[2].id, radius, unit, 'STORE', geoKey] );
    //     }
    // }
    // else
    // {
    //     throw new Error( `Invalid query: ${cmd.toString()}` )
    // }

    if( level > 1 )
    {
        // output distance
        this.indexes.geo = this.stack.length;
        this.stack.push( ['zrange', geoKey, 0, -1, 'WITHSCORES'] );
        // filter float ids
        // todo: required only if georadius is tail
        this.stack.push( ['zinterstore', resultKey, 2, geoKey, this.keys.index] );
        this.stores.tail.type = 'zset';

        return callback( null, resultKey );
    }
    else
    {
        this.stores.tail.type = 'georadius';
        return callback();
    }
}

function result() {
    this.result.geohashes = [];
    if( !this.result.raw.length ) return [];
    const raw = this.result.raw[this.queryChain.indexes.geo];

    if( this.queryChain.stores.tail.type === 'georadius' )
    {
        this.result.total = raw.length;
        for( let i = 0; i < raw.length; i++ )
        {
            this.result.geohashes.push( {
                id: raw[i][0],
                hash: raw[i][1]
            } );
            this.result.ids.push( raw[i][0] );
        }
    }
    else
    {
        for( let i = 0; i < raw.length / 2; i++ )
        {
            this.result.geohashes.push( {
                id: raw[i * 2],
                hash: raw[i * 2 + 1]
            } );
        }
    }
}

function getKeys( model ) {
    return {
        index: () => [model.ns, 'ix', 'gjs'].join( ':' ),
        points: ( bitDepth ) => [model.ns, 'ix', 'gjs:p', bitDepth].join( ':' ),
        groups: ( bitDepth ) => [model.ns, 'ix', 'gjs:g', bitDepth].join( ':' ),
        counter: ( bitDepth ) => [model.ns, 'ix', 'gjs:cnt', bitDepth].join( ':' )
    };
}

/**
 * Warn: adding points in parallel will fail in group coordinates calculation
 */
function insert( redis, model, id, entity, callback ) {


    function addPoint( id, lon, lat, callback ) {
        const geohash = ngeohash.encode_int( lat, lon );
        let group = bignum( geohash ),
            groups = [];

        // query.push( ['zadd', [model.ns, 'ix', 'gjs', 52].join( ':' ), '3386042809045974', geohash] );
        // query.push( ['zscore', [model.ns, 'ix', 'gjs', 52].join( ':' ), geohash] );
        groups.push( {bitDepth: 52, id: geohash} );
        for( let bitDepth = 50; bitDepth >= 8; bitDepth -= 2 )
        {
            group = group.shiftRight( 2 );
            groups.push( {bitDepth, id: group.toString()} );
            // query.push( ['zadd', [model.ns, 'ix', 'gjs', bitDepth].join( ':' ), '3386042809045974', group.toString()] );
            // query.push( ['zscore', [model.ns, 'ix', 'gjs', bitDepth].join( ':' ), group.toString()] );
        }
        const keys = getKeys( model );

        function middlePoint( lat, lon, geohash ) {
            const groupCoord = ngeohash.decode_int( geohash, 52 );
            const [middleLat,middleLon] = [(lat + groupCoord.latitude) / 2, (lon + groupCoord.longitude) / 2];
            return ngeohash.encode_int( middleLat, middleLon, 52 );
        }

        async.autoInject( {
            groups: [async.constant( groups )],
            scores: ['groups', ( groups, callback ) => {
                const query = _.map( groups, group => ['zscore', keys.groups( group.bitDepth ), group.id] );
                redis.batch( query ).exec( callback );
            }],
            update: ['groups', 'scores', ( groups, scores, callback ) => {
                const query = [];
                /* add point to index */
                query.push( ['geoadd', keys.index(), lon, lat, id] );
                for( var i = 0; i < groups.length; i++ )
                {
                    /* existent group */
                    if( scores[i] )
                    {
                        /* increment group points counter */
                        query.push( ['zincrby', keys.counter( groups[i].bitDepth ), 1, groups[i].id] );
                        query.push( ['zadd', keys.groups( groups[i].bitDepth ), middlePoint( lat, lon, scores[i] ), groups[i].id] );
                        query.push( ['zrem', keys.points( groups[i].bitDepth ), groups[i].id] );
                    }
                    /* new group */
                    else
                    {
                        /* set to 1 group points counter */
                        query.push( ['zincrby', keys.counter( groups[i].bitDepth ), 1, groups[i].id] );
                        query.push( ['geoadd', keys.groups( groups[i].bitDepth ), lon, lat, groups[i].id] );
                        query.push( ['zadd', keys.points( groups[i].bitDepth ), id, groups[i].id] );
                    }
                }
                redis.batch( query ).exec( callback );
            }]
        }, callback );
    }

    // addPoint( 1, 9, 9, ()=> {} );
    // console.log( 'A', a.toString() );
    // console.log( '0000' );
    // if( !model.index || _.isEmpty( model.index.geo ) ) return callback();
    //
    // console.log( '111111' );
    // const query = _.map( model.index.geo, function( latLngProp, indexName ) {
    //     const [lng,lat] = [entity[latLngProp[0]], entity[latLngProp[1]]];
    //     const query = [];
    //     query.push( ['geoadd', [model.ns, 'ix', 'geo', indexName, 52].join( ':' ), lng, lat, id] );
    //
    //     const geohash = bignum( point.hash );
    //     // even [8, 52]
    //     for( var i = 50; i >= 8; i -= 2 )
    //     {
    //         query.push( ['zadd', [model.ns, 'ix', 'geo', indexName, i].join( ':' ), lng, lat, id] );
    //     }
    // } );
    //
    // redis.batch( query ).exec( function( err ) {
    //     if( err ) return callback( error.tag( err, '1468806164051' ) );
    //     callback();
    // } );

    if( !model.index || _.isEmpty( model.index.geojson ) ) return callback();

    const //geometry = entity[model.index.geojson],
    // coordinates = _.chunk( _.flattenDeep( geometry.coordinates ), 2 ),
        coordinates = _.chunk( _.flattenDeep( entity[model.index.geojson] ), 2 );
    // query = _.map( coordinates, function( lngLat, i ) {
    //     const [lng,lat] = [lngLat[0], lngLat[1]];
    //     return ['geoadd', ['g', 'ix', 'gjs'].join( ':' ), lng, lat, i ? `${id}.${i}` : id];
    // } );
    // redis.batch( query ).exec( function( err ) {
    //     if( err ) return callback( error.tag( err, '1468821750249' ) );
    //     callback();
    // } );
    async.eachOfLimit( coordinates, 1, ( point, i, callback ) => {
        const [lon,lat] = [point[0], point[1]];
        addPoint( i ? `${id}.${i}` : id, lon, lat, callback );
    }, callback );
}

function deleteFeature( redis, model, id, entity, callback ) {
    function deletePoint( id, lon, lat, callback ) {
        const geohash = ngeohash.encode_int( lat, lon );
        let group = bignum( geohash ),
            groups = [];

        groups.push( {bitDepth: 52, id: geohash} );
        for( let bitDepth = 50; bitDepth >= 8; bitDepth -= 2 )
        {
            group = group.shiftRight( 2 );
            groups.push( {bitDepth, id: group.toString()} );
        }
        const keys = getKeys( model );

        async.autoInject( {
            groups: [async.constant( groups )],
            counters: ['groups', ( groups, callback ) => {
                const query = _.map( groups, group => ['zscore', keys.counter( group.bitDepth ), group.id] );
                redis.batch( query ).exec( callback );
            }],
            update: ['groups', 'counters', ( groups, counters, callback ) => {
                const query = [];
                /* remove point from index */
                query.push( ['zrem', keys.index(), lon, lat, id] );
                for( var i = 0; i < groups.length; i++ )
                {
                    query.push( ['zrem', keys.points( groups[i].bitDepth ), groups[i].id] );
                    /* decrement group points counter */
                    if( counters[i] > 1 )
                    {
                        query.push( ['zincrby', keys.counter( groups[i].bitDepth ), -1, groups[i].id] );
                    }
                    else
                    {
                        query.push( ['zrem', keys.counter( groups[i].bitDepth ), groups[i].id] );
                        query.push( ['zrem', keys.groups( groups[i].bitDepth ), groups[i].id] );
                    }
                }
                redis.batch( query ).exec( callback );
            }]
        }, callback );
    }

    if( !model.index || _.isEmpty( model.index.geojson ) ) return callback();

    const coordinates = _.chunk( _.flattenDeep( entity[model.index.geojson] ), 2 );
    async.eachOfLimit( coordinates, 1, ( point, i, callback ) => {
        const [lon,lat] = [point[0], point[1]];
        deletePoint( i ? `${id}.${i}` : id, lon, lat, callback );
    }, callback );
}

module.exports = {
    insert,
    parse,
    deleteFeature
    // result,
    // hydrate: {
    //     order: 10,
    //     fn: require( './document.query.plugin.georadius.clustering' )
    // }
};