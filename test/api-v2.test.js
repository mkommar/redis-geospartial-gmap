'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    chai = require( 'chai' ),
    sinon = require( 'sinon' ),
    expect = chai.expect,
    redis = require( '../server/redis' ),
    logger = require( '../server/logger' ),
    config = require( '../config.json' ),
    modelGeo = require( '../server/models/geo-v2' ),
    request = require( 'supertest' ),
    app = require( './mock/router.api-v2.js' ),
    qs = require( 'qs' );


const data = {};

data.points = [
    {
        coordinates: {
            latitude: 32.365031,
            longitude: -64.698767
        },
        properties: {
            placeName: 'Bermuda Airport'
        }
    },
    {
        coordinates: {
            latitude: 32.354601,
            longitude: -64.708526
        },
        properties: {
            placeName: 'The Causeway'
        }
    },
    {
        coordinates: {
            latitude: 32.320994,
            longitude: -64.715426
        },
        properties: {
            placeName: 'Devils Hole'
        }
    }
];

describe( 'api-v2', function() {
    before( function( done ) {
        sinon.stub( logger, 'info' );
        sinon.stub( logger, 'error' );
        async.series( [
            callback => redis.select( config.redis.databaseTest, callback ),
            callback => redis.flushdb( callback )
        ], done );
    } );
    after( function() {
        logger.info.restore();
        logger.error.restore();
    } );

    describe( '/v2/geo/points', function() {
        describe( 'POST /v2/geo/points (add new point)', function() {
            let response;

            it( 'should make request', function( done ) {
                request( app )
                    .post( '/v2/geo/points' )
                    .send( data.points[0] )
                    .end( function( err, res ) {
                        if( err ) throw err;
                        response = res;
                        done();
                    } )
            } );

            it( 'should test that response HTTP status code is 201', function() {
                expect( response.statusCode ).to.be.equal( 201 );
            } );

            it( 'should test that redis data was set', function( done ) {
                redis.batch( [
                    ['get', modelGeo.keys.autoincrement()],
                    ['zscore', modelGeo.keys.geospartial(), 1],
                    ['hgetall', modelGeo.keys.properties( 1 )]
                ] ).exec( ( err, raw ) => {
                    expect( err || null ).to.be.null;
                    expect( raw[0] ).to.be.equal( '1' );
                    expect( raw[1] ).to.be.equal( '1812196946076815' );
                    expect( raw[2] ).to.be.eql( data.points[0].properties );
                    done();
                } );
            } );
        } );

        describe( 'GET /v2/geo/points/1 (get point)', function() {
            let response;

            it( 'should make request', function( done ) {
                request( app )
                    .get( '/v2/geo/points/1' )
                    .end( function( err, res ) {
                        if( err ) throw err;
                        response = res;
                        done();
                    } )
            } );

            it( 'should test that response HTTP status code is 200', function() {
                expect( response.statusCode ).to.be.equal( 200 );
            } );

            it( 'should test that response data is correct', function( done ) {
                expect( response.body ).to.be.eql( _.assign( {id: 1}, data.points[0].properties ) );
                done();
            } );
        } );

        describe( 'DELETE /v2/geo/points/1 (delete point)', function() {
            let response;

            it( 'should make request', function( done ) {
                request( app )
                    .delete( '/v2/geo/points/1' )
                    .end( function( err, res ) {
                        if( err ) throw err;
                        response = res;
                        done();
                    } )
            } );

            it( 'should test that response HTTP status code is 204', function() {
                expect( response.statusCode ).to.be.equal( 204 );
            } );

            it( 'should test that redis data was set', function( done ) {
                redis.batch( [
                    ['get', modelGeo.keys.autoincrement()],
                    ['zscore', modelGeo.keys.geospartial(), 1],
                    ['hgetall', modelGeo.keys.properties( 1 )]
                ] ).exec( ( err, raw ) => {
                    expect( err || null ).to.be.null;
                    expect( raw[0] ).to.be.equal( '1' );
                    expect( raw[1] ).to.be.equal( null );
                    expect( raw[2] ).to.be.equal( null );
                    done();
                } );
            } );
        } );

        describe( 'GET /v2/geo/points (test validation)', function() {
            let response;

            it( 'should make request', function( done ) {
                const filter = {
                        georadius: {
                            coordinates: {
                                latitude: 90,
                                longitude: 181
                            },
                            radius: -100,
                            limit: {
                                count: 100
                            }
                        }
                    },
                    queryString = '?' + qs.stringify( filter, {encode: false, arrayFormat: 'brackets'} );

                request( app )
                    .get( `/v2/geo/points${queryString}` )
                    .end( function( err, res ) {
                        if( err ) throw err;
                        response = res;
                        done();
                    } );
            } );

            it( 'should test that response HTTP status code is 200', function() {
                expect( response.statusCode ).to.be.equal( 400 );
            } );

            it( 'should test that response validation messages is correct', function( done ) {

                const messages = response.body.metadata['req.query'];
                expect( messages[0].message ).to.be.equal( 'must have a maximum value of 85.05112878' );
                expect( messages[1].message ).to.be.equal( 'must have a maximum value of 180' );
                expect( messages[2].message ).to.be.equal( 'must have a minimum value of 1' );
                expect( messages[3].message ).to.be.equal( 'is required' );
                done();
            } );
        } );

        describe( 'GET /v2/geo/points (with georadius filter)', function() {
            let response;

            before( function( done ) {
                async.each( data.points, ( point, callback ) => {
                    request( app ).post( '/v2/geo/points' ).send( point ).end( callback )
                }, done );
            } );

            it( 'should make request', function( done ) {
                const filter = {
                        georadius: {
                            coordinates: {
                                latitude: data.points[0].coordinates.latitude,
                                longitude: data.points[0].coordinates.longitude
                            },
                            radius: 15,
                            units: 'km',
                            limit: {
                                count: 100
                            }
                        }
                    },
                    queryString = '?' + qs.stringify( filter, {encode: false, arrayFormat: 'brackets'} );

                request( app )
                    .get( `/v2/geo/points${queryString}` )
                    .end( function( err, res ) {
                        if( err ) throw err;
                        response = res;
                        done();
                    } );
            } );

            it( 'should test that response HTTP status code is 200', function() {
                expect( response.statusCode ).to.be.equal( 200 );
            } );

            it( 'should test that response data is correct', function( done ) {
                expect( response.body ).to.be.an( 'object' );
                expect( response.body.items ).to.be.an( 'array' );
                expect( response.body.items ).to.have.lengthOf( 3 );
                expect( response.body.items[0] ).to.have.all.keys( ['id', 'distance', 'properties'] );
                done();
            } );
        } );
    } );
} );

