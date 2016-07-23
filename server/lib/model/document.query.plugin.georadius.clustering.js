'use strict';

/**
 * Useful information:
 *      https://en.wikipedia.org/wiki/Geohash
 *      http://23.239.12.206:8000/posts/2014-04-05-geohash-proximity-pt2.html
 *      https://github.com/sunng87/node-geohash
 *      https://github.com/justmoon/node-bignum
 *      http://gis.stackexchange.com/a/92331
 *
 * Note node-geohash uses incompatible with Redis MIN_LAT and MAX_LAT,
 * so it was simple copied and constants was replaced. It's not a good solution.
 */

const _ = require( 'lodash' ),
    ngeohash = require( '../ngeohash' ),
    bignum = require( 'bignum' ),
    geolib = require( 'geolib' ),
    GeoPoint = require( 'geopoint' ),
    debug = require( 'debug' )( 'document:query' );

function minBitDepth( precision ) {
    return 52 - 2 * Math.floor( Math.log2( 4 * precision ) );
}

function decreasePrecision( point, bitDepth ) {
    /* Decrease point's geohash bit depth for comparsion */
    return bignum( point.hash ).shiftRight( 52 - bitDepth ).toString()
}

// function mapQueryGeoHashes( raw ) {
//     const geohashes = [];
//     if( !raw.length ) return [];
//     if( _.isArray( raw[0] ) )
//     {
//         for( let i = 0; i < raw.length; i++ )
//         {
//             geohashes.push( {
//                 id: raw[i][0],
//                 hash: raw[i][1]
//             } );
//         }
//     }
//     else
//     {
//         for( let i = 0; i < raw.length / 2; i++ )
//         {
//             geohashes.push( {
//                 id: raw[i * 2],
//                 hash: raw[i * 2 + 1]
//             } );
//         }
//     }
//     return geohashes;
// }

module.exports = function( callback ) {
    if( !this.query.geo || !this.query.geo.clustering ) return callback();
    debug( `HYDRATE GEO CLUSTERING`, `\n` );
    // console.time( `HYDRATE GEO CLUSTERING` );

    // console.time( `HYDRATE GEO GEOHASHES` );
    const geoCmd = _.find( this.queryChain.stack, cmd => ~cmd[0].indexOf( 'georadius' ) ),
        radius = 'georadius' ? geoCmd[4] : geoCmd[3],
        units = geoCmd[0] === 'georadius' ? geoCmd[5] : geoCmd[4],
    // geohashes = mapQueryGeoHashes( this.result.raw[this.queryChain.indexes.geo] );
        geohashes = this.result.geohashes;
    // console.timeEnd( `HYDRATE GEO GEOHASHES` );

    // console.log( geoCmd );
    // geohash.bboxes
    //geohash.bboxes (minlat, minlon, maxlat, maxlon, precision=9)
    /*
     [ 'georadius',
     'g:ix:gjs',
     '54.73180485937496',
     '53.430664410806614',
     '2634514',
     'm',
     'STORE',
     'g:ix:t:0376ae74dacc96ddef79d75cd6caa4bf2208a6aa' ]
     */
    const distanceKm = Math.sqrt( 2 * Math.pow( radius / 1000, 2 ) );
    console.log( distanceKm );

    // console.log( new GeoPoint( Number( geoCmd[3] ), Number( geoCmd[2] ) ).boundingCoordinates( distanceKm, true ) );

    // console.time( `HYDRATE GEO GEOHASHES GROUP` );
    const bitDepth = minBitDepth( radius / 4 ),
        group = {};
    for( let i = 0; i < geohashes.length; i++ )
    {
        const name = decreasePrecision( geohashes[i], bitDepth );
        if( !group[name] ) group[name] = [];
        group[name].push( geohashes[i] )
    }

    const map = _.transform( group, ( result, points, boundaryBoxHash ) => {
        /* If there is a single point in the group then push it to items list */
        if( points.length === 1 ) return result.ids.push( points[0].id );

        /* Either aggregate multiple points to one group
         * Aggregated points not included in the items list */

        /* There is an ordered by distance list of points
         * so the middle between first (the closest) and last (the farthest)
         * points of the group used as group coordinates
         *
         * Alternative way is to use boundary box center but it is not very accurate
         *      const groupBoundaryBox = ngeohash.decode_bbox_int( boundaryBoxHash, bitDepth );
         *      coordinates: [
         *          (groupBoundaryBox[3] + groupBoundaryBox[1]) / 2,
         *          (groupBoundaryBox[2] + groupBoundaryBox[0]) / 2
         *      ],
         */
        const pointF = ngeohash.decode_int( _.head( points ).hash );
        const pointL = ngeohash.decode_int( _.last( points ).hash );

        result.geo.groups.push( {
            groupId: boundaryBoxHash,
            coordinates: [
                (pointF.longitude + pointL.longitude) / 2,
                (pointF.latitude + pointL.latitude) / 2
            ],
            total: points.length
        } );
    }, {
        ids: [],
        geo: {
            groups: [],
            radius,
            units,
            bitDepth
        }
    } );

    this.result.ids = map.ids;
    this.result.geo = map.geo;

    // console.timeEnd( `HYDRATE GEO CLUSTERING` );
    callback();
};