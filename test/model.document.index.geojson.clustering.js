'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    chai = require( 'chai' ),
    expect = chai.expect,
    redis = require( '../server/redis' ),
    ModelDocument = require( '../server/lib/model/document' ),
    config = require( '../config.json' ),
    bignum = require( 'bignum' );

redis.select( config.redis.databaseTest );

describe( 'model.document.index.geo', function() {

    before( function( done ) {
        redis.flushdb( done );
    } );

    const schema = {
            properties: {
                coordinates: {
                    index: 0,
                    type: Array,
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
        data = [];

    data.push( {coordinates: [9, 9]} );
    for( let i = 0; i < 10; i++ )
    {
        data.push( {coordinates: [10 + i / 100, 10 + i / 100]} );
    }
    for( let i = 0; i < 20; i++ )
    {
        data.push( {coordinates: [11 + i / 100, 11 + i / 100]} );
    }
    for( let i = 0; i < 30; i++ )
    {
        data.push( {coordinates: [12 + i / 100, 12 + i / 100]} );
    }

    ModelDocument( redis, model );

    function decreasePrecision( point, bitDepth ) {
        /* Decrease point's geohash bit depth for comparsion */
        return bignum( point.hash ).shiftRight( 52 - bitDepth ).toString()
    }

    it( 'should #upsert items', function( done ) {
        async.each( data, model.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    /*
     HashBits, Radius Meters
     52, 0.5971
     50, 1.1943
     48, 2.3889
     46, 4.7774
     44, 9.5547
     42, 19.1095
     40, 38.2189
     38, 76.4378
     36, 152.8757
     34, 305.751
     32, 611.5028
     30, 1223.0056
     28, 2446.0112
     26, 4892.0224
     24, 9784.0449
     22, 19568.0898
     20, 39136.1797
     18, 78272.35938
     16, 156544.7188
     14, 313089.4375
     12, 626178.875
     10, 1252357.75
     8, 2504715.5
     6, 5009431
     4, 10018863
     */

    it( 'should test #query georadius clustering (ids only)', function( done ) {
        /*
         * Note
         * distance between [10,10] and [11,11] 155.9 km
         * distance between [11,11] and [12,12] 155.7 km
         * distance between [10,10] and [12,12] 311.6 km
         */
        const radius = 400 * 1000;
        model.query( {
            select: ['georadius', 'coord', [10, 10], radius, 'm'],
            // idOnly: true,
            geo: {
                // withDist: true,
                // withHash: true,
                clustering: true
            },
            idOnly: true
        }, ( err, res ) => {
            expect( err || null ).to.be.null;

            // total points
            expect( res.total ).to.be.equal( 1 );

            // only one ungrouped point
            expect( res.ids.length ).to.be.equal( 1 );
            expect( res.ids ).to.be.eql( [1] );

            // total points (1 + 10 + 20 + 30)
            expect( res.geo.total ).to.be.equal( 61 );

            // groups
            expect( res.geo.groups.length ).to.be.equal( 3 );

            // group #1
            expect( res.geo.groups[0].groupId ).to.be.equal( '49279' );
            expect( res.geo.groups[0].total ).to.be.equal( 10 );
            expect( res.geo.groups[0].coordinates[0] ).to.be.within( 9.8, 10.2 );
            expect( res.geo.groups[0].coordinates[1] ).to.be.within( 9.8, 10.2 );

            // group #2
            expect( res.geo.groups[1].groupId ).to.be.equal( '49450' );
            expect( res.geo.groups[1].total ).to.be.equal( 20 );
            expect( res.geo.groups[1].coordinates[0] ).to.be.within( 10.8, 11.3 );
            expect( res.geo.groups[1].coordinates[1] ).to.be.within( 10.8, 11.3 );

            // group #3
            expect( res.geo.groups[2].groupId ).to.be.equal( '49540' );
            expect( res.geo.groups[2].total ).to.be.equal( 30 );
            expect( res.geo.groups[2].coordinates[0] ).to.be.within( 11.8, 12.4 );
            expect( res.geo.groups[2].coordinates[1] ).to.be.within( 11.8, 12.4 );

            // metadata
            expect( res.geo.radius ).to.be.equal( 400 * 1000 );
            expect( res.geo.units ).to.be.equal( 'm' );
            expect( res.geo.bitDepth ).to.be.equal( 16 );

            // console.log( res.geo.groups[2].coordinates );
            // console.log( res.geo.groups[2].boundaryBox );

            done();
        } );
    } );

    it.skip( 'should test #query georadius clustering (with entity loading)', function( done ) {
        const radius = 400 * 1000;
        model.query( {
            select: ['georadius', 'coord', [10, 10], radius, 'm'],
            geo: {
                clustering: true
            }
        }, ( err, res ) => {
            expect( err || null ).to.be.null;

            // total points
            expect( res.total ).to.be.equal( 1 );

            // only one ungrouped point
            expect( res.ids.length ).to.be.equal( 1 );
            expect( res.ids ).to.be.eql( [1] );

            // only one ungrouped point
            expect( res.items.length ).to.be.equal( 1 );
            expect( res.items ).to.be.eql( [{coordinates: [9, 9], id: 1}] );

            // total points (1 + 10 + 20 + 30)
            expect( res.geo.total ).to.be.equal( 61 );

            // groups
            expect( res.geo.groups.length ).to.be.equal( 3 );

            // group #1
            expect( res.geo.groups[0].groupId ).to.be.equal( '49279' );
            expect( res.geo.groups[0].total ).to.be.equal( 10 );
            expect( res.geo.groups[0].coordinates[0] ).to.be.within( 9.8, 10.2 );
            expect( res.geo.groups[0].coordinates[1] ).to.be.within( 9.8, 10.2 );

            // group #2
            expect( res.geo.groups[1].groupId ).to.be.equal( '49450' );
            expect( res.geo.groups[1].total ).to.be.equal( 20 );
            expect( res.geo.groups[1].coordinates[0] ).to.be.within( 10.8, 11.3 );
            expect( res.geo.groups[1].coordinates[1] ).to.be.within( 10.8, 11.3 );

            // group #3
            expect( res.geo.groups[2].groupId ).to.be.equal( '49540' );
            expect( res.geo.groups[2].total ).to.be.equal( 30 );
            expect( res.geo.groups[2].coordinates[0] ).to.be.within( 11.8, 12.4 );
            expect( res.geo.groups[2].coordinates[1] ).to.be.within( 11.8, 12.4 );

            // metadata
            expect( res.geo.radius ).to.be.equal( 400 * 1000 );
            expect( res.geo.units ).to.be.equal( 'm' );
            expect( res.geo.bitDepth ).to.be.equal( 16 );

            done();
        } );
    } );
} );