'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    chai = require( 'chai' ),
    expect = chai.expect,
    redis = require( '../../server/redis' ),
    modelGeo = require( '../../server/models/geo' ),
    config = require( '../../config.json' );

redis.select( config.redis.databaseTest );

describe( 'model.document.index.geo', function() {

    const data = require( '../geojson-data-5' );

    before( function( done ) {
        redis.flushdb( done );
    } );

    it( 'should #upsert items', function( done ) {
        async.eachSeries( data, modelGeo.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test modelGeo#query georadius by point', function( done ) {
        modelGeo.query( {
            select: ['georadius', 'coord', [88.3722, 69.4994], '100000', 'm'],
            geo: {
                clustering: true
            }
        }, ( err, res ) => {
            expect( err || null ).to.be.null;
            console.log( res );
            // console.log( res.items[100] );
            done();
        } );
    } );
} );