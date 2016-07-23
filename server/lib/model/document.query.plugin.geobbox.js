const _ = require( 'lodash' ),
    ngeohash = require( '../ngeohash' ),
    bignum = require( 'bignum' ),
    geolib = require( 'geolib' ),
    debug = require( 'debug' )( 'document:query:geobbox' ),
    uuid = require( 'node-uuid' ),
    microtime = require( 'microtime' );
;

function getKeys( model ) {
    return {
        index: () => [model.ns, 'ix', 'gjs'].join( ':' ),
        points: ( bitDepth ) => [model.ns, 'ix', 'gjs:p', bitDepth].join( ':' ),
        groups: ( bitDepth ) => [model.ns, 'ix', 'gjs:g', bitDepth].join( ':' ),
        counter: ( bitDepth ) => [model.ns, 'ix', 'gjs:cnt', bitDepth].join( ':' )
    };
}

function parse( cmd, level, callback ) {
    const bitDepth = Math.ceil( bignum( cmd[1] ).bitLength() / 2 ) * 2,
        bBox = ngeohash.decode_bbox_int( cmd[1], bitDepth ),
        bBoxMid = [(bBox[0] + bBox[2]) / 2, (bBox[1] + bBox[3]) / 2],
        bBoxRadius = Math.sqrt( 2 ) * geolib.getDistance( {
                latitude: bBox[0],
                longitude: bBox[1]
            }, {
                latitude: bBoxMid[0],
                longitude: bBoxMid[1]
            } ),
        keys = getKeys( this.model ),
        [offset, count] = [cmd[2] || 0, cmd[3]];

    const tempKeys = _.times( 1, () => `${this.prefixes.temp}:${uuid.v4()}` );
    this.stores.tempKeys.push( ...tempKeys );

    const queryStack = [
        ['georadius', keys.index(), bBoxMid[1], bBoxMid[0], bBoxRadius, 'm', 'WITHCOORD']
    ];

    if( count ) queryStack[0].push( ...['COUNT', count] );

    this.debug.table( {
        title: 'QUERY GEOBBOX',
        head: ['ID', 'QUERY'],
        body: _.map( queryStack, ( v, i )=>[i, v.join( ' ' )] )
    } );

    let timestamp = microtime.now();
    this.redis.batch( queryStack ).exec( ( err, res ) => {
        if( this.query.perfmon ) this.result.metrics.execTimeUs += microtime.now() - timestamp;
        this.result.geo = {
            groups: [],
            total: 0,
            radius: bBoxRadius,
            units: 'm',
            bitDepth
        };

        _.forEach( res[0], point => {
            /*
             * bBox [minlat, minlon, maxlat, maxlon]
             * point[1][lon, lat]
             */
            if( /* lon */ !_.inRange( point[1][0], bBox[1], bBox[3] ) ) return;
            if( /* lat */ !_.inRange( point[1][1], bBox[0], bBox[2] ) ) return;
            this.result.ids.push( point[0] );
        }, [] );

        if( level === 1 )
        {
            // this.stores.tail.type = 'list';
            // return callback();
        }
        if( this.result.ids.length )
        {
            this.stack.push( ['sadd', tempKeys[0], ...this.result.ids] );
            this.stores.tail.type = 'sset';
            callback( null, tempKeys[0] );
        }
        else
        {
            callback();
        }
    } );
}

module.exports = {
    parse
};