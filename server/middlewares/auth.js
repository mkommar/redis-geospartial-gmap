'use strict';

const _ = require( 'lodash' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    passport = require( 'passport' ),
    middleware = {};

middleware.jwt = function( options ) {
    if( !_.isBoolean( options.breakIfDenied ) ) options.breakIfDenied = true;
    return function( req, res, next ) {
        passport.authenticate( 'jwt', {session: false}, function( err, user ) {
            if( err ) return next( error.tag( err, '1465588764430' ) );
            if( options.breakIfDenied )
            {
                if( !user || !user.id ) return next( error.code( 403, '1465586808184' ) );
                req.user = user;
            }
            else
            {
                req.user = user || {};
            }
            next();
        } )( req, res, next );
    };
};

module.exports = middleware;