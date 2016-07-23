'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    chai = require( 'chai' ),
    expect = chai.expect,
    redis = require( '../server/redis' ),
    modelGeo = require( '../server/models/geo' ),
    config = require( '../config.json' ),
    bignum = require( 'bignum' );

redis.select( config.redis.databaseTest );

describe( 'model.document.index.geo', function() {

    before( function( done ) {
        redis.flushdb( done );
    } );

    const data = require( './geojson-data-5' );

    it( 'should #upsert items', function( done ) {
        async.eachSeries( data, modelGeo.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should #upsert items', function( done ) {
        async.eachSeries( data, modelGeo.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

} );