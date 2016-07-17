var redis = require( 'redis' ),
    redisConfig = require( '../config' ).redis,
    client = redis.createClient( redisConfig ),
    logger = require( './logger' );

client.on( 'error', function( err ) {
    if( err ) logger.error( {module: 'redis-pubsub', error: err} );
} );

client.select( redisConfig.database, function() {} );

module.exports = client;