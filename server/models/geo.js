'use strict';

/**
 * @constructor
 */
function ModelGeo() {}

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    redis = require( '../redis' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    debug = require( 'debug' )( 'model:geo' ),
    ModelDocument = require( '../lib/model/document' ),
    ngeohash = require( '../lib/ngeohash' ),
    crypto = require( 'crypto' ),
    levelup = require( 'levelup' ),
    config = require( '../config' ),
    entityDb = levelup( config.get( 'leveldb:database' ) ),
    bignum = require( 'bignum' ),
    plugins = {
        georadius: require( '../lib/model/document.query.plugin.georadius' )
    },
    schema = {
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
                enum: ['geoname', 'custom'],
                updatable: true,
                scope: ['private', 'public']
            }
        }
    },
    /**
     * @type {ModelDocument|ModelGeo|{
     *      name: string,
     *      ns: string
     * }}
     */
    model = {
        name: 'geo',
        ns: 'g',
        schema: schema,
        index: {
            geojson: 'coordinates'
        },
        entityDb: entityDb
    };

ModelDocument( redis, model );

function minBitDepth( precision ) {
    return 52 - 2 * Math.floor( Math.log2( 4 * precision ) );
}

/**
 * @param latitude
 * @param longitude
 * @param radius
 * @param units
 * @param limit
 * @param offset
 */
model.cacheKey = function( latitude, longitude, radius, units, limit, offset ) {
    // console.log( 'cacheKey', latitude, longitude, radius, units, limit, offset );
    const bitDepth = minBitDepth( radius / 2 );
    const geohash = ngeohash.encode_int( latitude, longitude, bitDepth );
    console.log( 'GEOHASH', geohash );
    console.log( 'BITDEPTH', bitDepth );
    return crypto.createHash( 'sha1' ).update( [geohash, radius, units].join( '' ) ).digest( 'hex' );
};

/**
 * @param key
 * @param query
 * @param callback
 */
model.cachedQuery = function( key, query, callback ) {
    model.query( query, callback );
};

model.pointsByGroup = function( groupId, options, callback ) {
    model.query( {
        select: ['geobbox', groupId, 0, 100]
    }, callback );
};

model.pointsByGroupIds = function( groupId, options, callback ) {
    model.query( {
        select: options.limit ? ['geobbox', groupId, 0, 10] : ['geobbox', groupId],
        idOnly: true
    }, callback );
};

model.deleteFeature = function( featureId, callback ) {
    model.getById( featureId, ( err, entity ) => {
        if( err ) return callback( err );
        plugins.georadius.deleteFeature( redis, model, featureId, entity, function( err ) {
            if( err ) return callback( error.tag( err, '1469181120099' ) );
            callback();
        } );
    } );
};

model.deleteGroup = function( groupId, callback ) {
    console.log( 'model geo deleteGroup', groupId );
    model.pointsByGroupIds( groupId, {}, ( err, list ) => {
        if( err ) return callback( err );
        console.log( list );
        console.log( 'model geo deleteGroup points ', list.ids.length );
        async.eachSeries( list.ids, model.deleteFeature, callback )
    } );
};

module.exports = model;