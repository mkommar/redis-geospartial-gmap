'use strict';

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    redis = require( '../redis' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    model = {
        name: 'geo',
        ns: 'g',
        index: {
            geojson: 'coordinates'
        },
        keys: {
            autoincrement: () => `g:counter`,
            geospartial: () => `g:gix`,
            properties: ( id ) => `g:p:${id}`
        },
        schema: {
            filter: {
                georadius: require( './geo-v2/filter.georadius.schema.json' )
            }
        }
    };

/**
 * @param {object} coordinates
 * @param {number} coordinates.lat
 * @param {number} coordinates.lng
 * @param {object} properties
 * @param callback
 */
model.addPoint = function( coordinates, properties, callback ) {
    async.autoInject( {
        /* get new item ID */
        id: [( callback ) => {
            redis.incr( model.keys.autoincrement(), callback )
        }],
        /* push point coordinates to geospartial index */
        geo: ['id', ( id, callback ) => {
            redis.geoadd( model.keys.geospartial(), coordinates.lng, coordinates.lat, id, callback );
        }],
        /* push point properties to store */
        properties: ['id', ( id, callback ) => {
            if( !properties || _.isEmpty( properties ) ) return callback();
            redis.hmset( model.keys.properties( id ), properties, callback );
        }]
    }, ( err, {id} ) => {
        if( err ) return callback( error.tag( err, '1469525714617' ) );
        callback( null, {id: Number( id )} );
    } );
};

/**
 * @param {number} id
 * @param callback
 */
model.getPoint = function( id, callback ) {
    redis.hgetall( model.keys.properties( id ), ( err, properties ) => {
        if( err ) return callback( error.tag( err, '1469524722950' ) );
        callback( null, _.assign( {id: Number( id )}, properties ) );
    } );
};

/**
 * @param {number} id
 * @param callback
 */
model.deletePoint = function( id, callback ) {
    // try to remove point from geospartial index
    redis.zrem( model.keys.geospartial(), id, ( err, isRemoved ) => {
        if( !isRemoved ) return callback( null, 0 );
        // if point was removed from geospartial index then clean up point properties
        // note: autoincrement counter is not decremented
        redis.del( model.keys.properties( id ), err => {
            if( err ) return callback( error.tag( err, '1469525511288' ) );
            // perhaps the point has no properties, so there is always callbacked 1
            callback( null, 1 )
        } );
    } );
};

/**
 * @param {object} coordinates
 * @param {number} coordinates.lat
 * @param {number} coordinates.lng
 * @param {number} radius
 * @param {string} units
 * @param {object} limit
 * @param {number} limit.count
 * @param {function} callback
 */
model.getPointsByRadius = function( coordinates, radius, units, limit, callback ) {
    /* find points ids by radius */
    redis.georadius(
        model.keys.geospartial(),
        coordinates.lng,
        coordinates.lat,
        radius,
        units,
        'WITHDIST',
        'WITHCOORD',
        'COUNT',
        limit.count,
        ( err, raw ) => {
            if( err ) return callback( error.tag( err, '1469542017941' ) );

            /* load points properties */
            const points = _.map( raw, point => ({
                    id: point[0],
                    distance: point[1],
                    coordinates: {
                        lat: Number( point[2][1] ),
                        lng: Number( point[2][0] )
                    }
                }) ),
                query = _.map( points, point => ['hgetall', model.keys.properties( point.id )] );

            redis.batch( query ).exec( ( err, properties ) => {
                if( err ) return callback( error.tag( err, '1469543298252' ) );
                /* mix point id and distance with point properties */
                callback( null, {
                    items: _.zipWith( points, properties,
                        ( point, properties ) => _.assign( {}, point, {properties} )
                    )
                } );
            } );
        } );
};

module.exports = model;