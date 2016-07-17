'use strict';

const _ = require( 'lodash' ),
    express = require( 'express' ),
    router = express.Router(),
    passport = require( 'passport' ),
    error = require( '../error' ),
    logger = require( '../logger' ),
    config = require( '../config' ),
    providers = _.keys( config.get( 'passport' ) );

router.get( '/auth/:provider/callback',
    function( req, res, next ) {
        let provider = req.params.provider;
        if( !~providers.indexOf( provider ) ) return next();
        passport.authenticate( provider )( req, res, function( err ) {
            if( err && err.oauthError )
            {
                return next( error.code( err.oauthError.statusCode, '1466531247037', JSON.parse( err.oauthError.data ) ) );
            }
            if( err ) return next( error.tag( err, '1466531247037' ) );
            return res.redirect( '/' );
        } );
    }
);

router.get( '/auth/:provider',
    function( req, res, next ) {
        let provider = req.params.provider;
        if( !~providers.indexOf( provider ) ) return next();
        let options = {};
        if( config.get( `passport:${provider}:scope` ) ) options.scope = config.get( `passport:${provider}:scope` );
        passport.authenticate( provider, options )( req, res, next );
    }
);

router.get( '/logout',
    function( req, res ) {
        req.logout();
        res.clearCookie( 'jwt' );
        res.redirect( '/' );
    }
);

module.exports = router;