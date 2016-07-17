'use strict';

const express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    cookieParser = require( 'cookie-parser' ),
    expressSession = require( 'express-session' ),
    csurf = require( 'csurf' ),
    i18next = require( '../i18next' ),
    i18nextMiddleware = require( 'i18next-express-middleware' ),
    config = require( '../config' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    passport = require( 'passport' ),
    passportStrategies = require( './passport' ),
    redis = require( '../redis' ),
    tokenMiddleware = require( './token' ),
    FileStore = config.get( 'app:sessionStore' ) === 'filestore' && require( 'session-file-store' )( expressSession ),
    RedisStore = config.get( 'app:sessionStore' ) === 'redis' && require( 'connect-redis' )( expressSession );

function csrf() {
    return [csurf(), function( req, res, next ) {
        if( req.method === 'GET' ) return next();
        req.csrftoken = req.csrfToken();
        res.locals.csrftoken = req.csrftoken;
        next();
    }];
}

function parser() {
    return [
        bodyParser.json(),
        bodyParser.urlencoded( {extended: false} ),
        cookieParser()
    ];
}

function session() {
    if( !config.get( 'app:secret' ) ) throw Error( 'Cookie secret undefined' );
    const sessionStore =
            config.get( 'app:sessionStore' ) === 'filestore' && new FileStore( {} )
            || config.get( 'app:sessionStore' ) === 'redis' && new RedisStore( {client: redis} ),
        options = {
            store: sessionStore,
            secret: config.get( 'app:secret' ),
            key: 'sid',
            cookie: {
                /* NOTE: setting domain will share cookie across all downstream subdomains */
                //domain: config.get( 'app:baseUrl' ).replace( /http(s)?:\/\//, '' ),
                httpOnly: true,
                secure: config.get( 'app:secure' ),
                maxAge: 1000 * 60 * 60 * 24 * 14 // 2 weeks
            },
            resave: false,
            saveUninitialized: false
        };

    passportStrategies( passport ).session();

    return [
        expressSession( options ),
        passport.initialize(),
        passport.session()
    ];
}

function auth() {
    if( !config.get( 'app:jwtSecret' ) ) throw Error( 'JWT secret undefined' );
    passportStrategies( passport ).google();
    passportStrategies( passport ).facebook();
    return [
        tokenMiddleware
    ];
}

function i18n() {
    return [
        i18nextMiddleware.handle( i18next ),
        function( req, res, next ) {
            req.app.locals.lang = req.language;
            next();
        }
    ];
}

module.exports = [
    parser(),
    session(),
    auth(),
    i18n(),
    csrf()
];