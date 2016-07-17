'use strict';

const async = require( 'neo-async' ),
    redis = require( '../redis' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    model = {
        name: 'service-token',
        ns: 'st'
    };

model.getToken = function( service, renewCallback, callback ) {
    const key = [model.ns, service].join( ':' );
    redis.get( key, ( err, token ) => {
        if( err ) return callback( error.tag( err, '1466615724547' ) );
        if( token ) return callback( null, JSON.parse( token ) );
        renewCallback( ( token, ttl ) => {
            redis.batch( [
                ['set', key, JSON.stringify( token )],
                ['expire', key, ttl]
            ] ).exec( err => {
                if( err ) return callback( error.tag( err, '1466616035174' ) );
                callback( null, token );
            } );
        } );
    } );
};

module.exports = model;