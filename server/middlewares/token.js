'use strict';

const error = require( '../error' ),
    config = require( '../config' ),
    modelUser = require( '../models/user' );

if( !config.get( 'app:jwtSecret' ) ) throw Error( 'JWT secret undefined' );

module.exports = function( req, res, next ) {
    if( !req.user || !req.user.id ) return next();
    modelUser.getToken( req.user.id, config.get( 'app:jwtSecret' ), function( err, token ) {
        if( err ) return next( error.tag( err, '1466601695696' ) );
        if( req.cookies.jwt === token ) return next();
        res.cookie( 'jwt', token, {secure: config.get( 'app:secure' )} );
        return next();
    } );
};