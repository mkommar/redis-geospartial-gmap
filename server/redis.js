'use strict';

const redis = require( 'redis' ),
    redisConfig = require( '../config' ).redis,
    client = redis.createClient( redisConfig ),
    logger = require( './logger' );

client.on( 'error', function( err ) {
    if( err ) logger.error( {module: 'redis', error: err} );
} );

client.select( redisConfig.database, function() { } );

/**
 * @type {RedisClient}
 */
module.exports = client;