"use strict";

var async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    config = require( '../config' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    DigestStrategy = require( 'passport-http' ).DigestStrategy;

function digestStrategyMiddleware( username, callback ) {
    if( !username ) return callback( null, false );
    const users = config.get( 'app:private:users' );
    if( !users || !users.length ) throw new Error( 'Digest auth user list not defined' );
    const user = _.find( users, ['login', username] );
    if( !user || !user.password ) return callback( null, false );
    logger.info( `passport digest login, user=${username}` );
    callback( null, {login: username}, user.password );
}

module.exports = function( passport ) {
    return {
        digest: function() {
            passport.use( new DigestStrategy( {
                    qop: 'auth'
                },
                digestStrategyMiddleware
            ) );
        }
    };
};