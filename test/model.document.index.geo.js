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
                pointId: {
                    index: 0,
                    type: String,
                    scope: ['private', 'public']
                },
                displayName: {
                    index: 1,
                    type: String,
                    updatable: true,
                    scope: ['private', 'public']
                },
                lng: {
                    index: 2,
                    type: Number,
                    updatable: true,
                    scope: ['private', 'public']
                },
                lat: {
                    index: 3,
                    type: Number,
                    updatable: true,
                    scope: ['private', 'public']
                },
                dataset: {
                    index: 4,
                    type: String,
                    enum: ['geoname'],
                    updatable: true,
                    scope: ['private', 'public']
                },
                properties: {
                    index: 5,
                    type: Object,
                    updatable: true,
                    scope: ['private', 'public']
                },
                createdAt: {
                    index: 6,
                    type: Number,
                    default: function() {
                        return Date.now();
                    },
                    scope: ['private']
                }
            }
        },
        model = {
            name: 'geo',
            ns: 'g',
            schema: schema,
            index: {
                primary: ['pointId'],
                simple: ['dataset'],
                geo: {coord: ['lng', 'lat']}
            }
        },
        data = _.map( require( './geojson-data.json' ).features, feature => ({
            pointId: feature.id,
            displayName: feature.properties.name,
            lat: feature.geometry.coordinates[0],
            lng: feature.geometry.coordinates[1],
            dataset: 'geoname',
            properties: _.omit( feature.properties, ['name'] )
        } ) );

    ModelDocument( redis, model );

    it( 'should #upsert items', function( done ) {
        async.each( data, model.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test #query georadius by point', function( done ) {
        model.query( {
            select: ['georadius', 'coord', [41.9184129, 12.4844774], '1', 'km'],
            idOnly: true
        }, ( err, res ) => {
            expect( err || null ).to.be.null;
            expect( res.items ).to.be.eql( [1, 2] );
            done();
        } );
    } );

    it( 'should test #query georadius by entity', function( done ) {
        model.query( {
            select: ['georadius', 'coord', _.assign( {id: 1}, data[0] ), '1', 'km'],
            idOnly: true
        }, ( err, res ) => {
            expect( err || null ).to.be.null;
            expect( res.items ).to.be.eql( [1, 2] );
            done();
        } );
    } );

    it( 'should test #query georadius with distance', function( done ) {
        model.query( {
            select: ['georadius', 'coord', _.assign( {id: 1}, data[0] ), '1', 'km'],
            // idOnly: true,
            geo: {
                withDist: true
            }
        }, ( err, res ) => {
            console.log( res );
            expect( err || null ).to.be.null;
            // expect( res.items ).to.be.eql( [1, 2] );
            expect( res.geo.coord.distance ).to.be.an( 'object' );
            expect( res.geo.coord.units ).to.be.equal( 'km' );
            done();
        } );
    } );
} );