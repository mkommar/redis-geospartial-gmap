'use strict';

const _ = require( 'lodash' ),
    chai = require( 'chai' ),
    expect = chai.expect,
    ngeohash = require( '../server/lib/ngeohash' );

describe( 'ngeohash', function() {

    function minBitDepth( precision ) {
        return 52 - 2 * Math.floor( Math.log2( 4 * precision ) );
    }

    function pointsToPolygon( points ) {
        return [
            [points[0][0], points[0][1]],
            [points[0][0], points[1][1]],
            [points[1][0], points[1][1]],
            [points[1][0], points[0][1]],
            [points[0][0], points[0][1]]
        ]
    }

    it( 'should #upsert items', function( done ) {
        const radius = 100 * 1000; // 100km
        const point = {lat: 88.185174, lon: 69.352158}; // Норильск
        const bitDepth = minBitDepth( radius / 4 );
        const geohash = ngeohash.encode_int( point.lat, point.lon, bitDepth );
        const bbox = ngeohash.decode_bbox_int( geohash, bitDepth );

        console.log( {
            radius,
            point,
            bitDepth,
            geohash,
            bbox: _.chunk( bbox, 2 ),
            polygon: pointsToPolygon( _.chunk( bbox, 2 ) )
        } );

        done();
    } );

} );