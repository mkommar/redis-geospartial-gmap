'use strict';

const async = require( 'async' );

module.exports = function( redis ) {
    var redisHelper = {};

    redisHelper.spush = function( key, callback ) {
        async.retry( 5, function( next ) {
            redis.scard( key, function( err, count ) {
                var id = count + 1;
                redis.sadd( key, id, function( err, success ) {
                    if( err ) return next( err );
                    if( !success ) return next( false );
                    next( null, id );
                } );
            } );
        }, callback );
    };

    redisHelper.zpush = function( key, score, callback ) {
        async.retry( 5, function( next ) {
            redis.zcard( key, function( err, count ) {
                var id = count + 1;
                redis.zadd( key, score, id, function( err, success ) {
                    if( err ) return next( err );
                    if( !success ) return next( false );
                    next( null, id );
                } );
            } );
        }, callback );
    };

    redisHelper.lock = function( hash, callback ) {
        async.retry( {times: 10, interval: Math.floor( Math.random() * 50 + 20 )},
            function( callback ) {
                redis.setnx( 't:' + hash, 'lock', function( err, res ) {
                    if( !res ) return callback( new Error() );
                    redis.pexpire( 't:' + hash, 1000 );
                    callback();
                } );
            },
            function( err ) {
                if( err ) console.error( err );
                if( err ) return callback( new Error( 'Lock timeout (hash: ' + hash + ')' ) );
                callback( null, function( done ) {
                    redis.del( 't:' + hash, function( err ) {
                        if( err ) return callback( err );
                        if( done ) done();
                    } );
                } );
            }
        );
    };

    return redisHelper;
};