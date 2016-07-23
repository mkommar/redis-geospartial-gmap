'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    chai = require( 'chai' ),
    expect = chai.expect,
    redis = require( '../server/redis' ),
    ModelDocument = require( '../server/lib/model/document' ),
    config = require( '../config.json' );

redis.select( config.redis.databaseTest );

describe( 'model.document.index.geo', function() {

    before( function( done ) {
        redis.flushdb( done );
    } );

    const schema = {
            properties: {
                type: {
                    index: 0,
                    type: String,
                    updatable: true,
                    scope: ['private', 'public'],
                    enum: ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'],
                    default: 'Point'
                },
                coordinates: {
                    index: 1,
                    type: Array,
                    updatable: true,
                    scope: ['private', 'public']
                },
                properties: {
                    index: 2,
                    type: Object,
                    updatable: true,
                    scope: ['private', 'public']
                },
                dataset: {
                    index: 3,
                    type: String,
                    enum: ['geoname'],
                    updatable: true,
                    scope: ['private', 'public']
                }
            }
        },
        model = {
            name: 'geo',
            ns: 'g',
            schema: schema,
            index: {
                geojson: 'coordinates'
            }
        },
        data = _.map( require( './geojson-data-2.json' ).features, feature => ({
            pointId: 'feature-' + _.uniqueId(),
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates,
            properties: feature.properties,
            dataset: 'geoname'
        } ) );

    ModelDocument( redis, model );

    it( 'should #upsert items', function( done ) {
        async.each( data, model.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    // it( 'should test #query georadius by point', function( done ) {
    //     model.query( {
    //         select: ['georadius', 'coord', [102.0, 0.5], '280', 'km'],
    //         idOnly: true
    //     }, ( err, res ) => {
    //         expect( err || null ).to.be.null;
    //         expect( res.items ).to.be.eql( [1, 3, 2] );
    //         done();
    //     } );
    // } );
    //
    // it( 'should test #query georadius by entity', function( done ) {
    //     model.query( {
    //         select: ['georadius', 'coord', _.assign( {id: 1}, data[0] ), '280', 'km'],
    //         idOnly: true
    //     }, ( err, res ) => {
    //         expect( err || null ).to.be.null;
    //         expect( res.items ).to.be.eql( [1, 2, 3] );
    //         done();
    //     } );
    // } );
    //
    // it( 'should test #query georadius with distance', function( done ) {
    //     model.query( {
    //         select: ['georadius', 'coord', _.assign( {id: 1}, data[0] ), '280', 'km'],
    //         // idOnly: true,
    //         geo: {
    //             withDist: true
    //         }
    //     }, ( err, res ) => {
    //         console.log( res );
    //         expect( err || null ).to.be.null;
    //         // expect( res.items ).to.be.eql( [1, 2] );
    //         expect( res.geo.distance ).to.be.an( 'object' );
    //         expect( res.geo.units ).to.be.equal( 'km' );
    //         done();
    //     } );
    // } );

    it( 'should test #query georadius with distance', function( done ) {
        model.query( {
            select: ['georadius', 'coord', _.assign( {id: 1}, data[0] ), '280', 'km'],
            // idOnly: true,
            geo: {
                withDist: true
            }
        }, ( err, res ) => {
            console.log( res );
            expect( err || null ).to.be.null;
            // expect( res.items ).to.be.eql( [1, 2] );
            expect( res.geo.distance ).to.be.an( 'object' );
            expect( res.geo.units ).to.be.equal( 'km' );
            done();
        } );
    } );
} );