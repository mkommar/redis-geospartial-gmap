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
        data = require( './geojson-data-5' );

    ModelDocument( redis, model );

    it( 'should #upsert items', function( done ) {
        async.eachSeries( data, model.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test #query georadius clustering (ids only)', function( done ) {
        const radius = 71100;
        model.query( {
            select: ['georadius', 'coord', [88.03548527929684, 69.352158], radius, 'm'],
            geo: {
                clustering: true
            }
        }, ( err, res ) => {
            expect( err || null ).to.be.null;
            console.log( res.items );

            // group #1
            expect( res.geo.groups[0].groupId ).to.be.equal( '913027' );
            expect( res.geo.groups[0].total ).to.be.equal( 2 );
            expect( res.geo.groups[0].coordinates[0] ).to.be.within( 87.5390625, 87.890625 );
            expect( res.geo.groups[0].coordinates[1] ).to.be.within( 69.27015761964844, 69.43627310554687 );

            done();
        } );
    } );

    it( 'should test #deletePoint', function( done ) {
        const geo = require( '../server/lib/model/document.query.plugin.georadius' );
        geo.deleteFeature( redis, model, 1, data[0], err => {
            expect( err || null ).to.be.null;
            done();
        } );
    } );
} );

