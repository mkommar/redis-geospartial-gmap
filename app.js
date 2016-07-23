'use strict';

const _ = require( 'lodash' ),
    path = require( 'path' ),
    config = require( './server/config' ),
    fs = require( 'fs-extra' );

config.load( function( err, data ) {
    let update = false;
    if( update |= !data.app.secret ) config.set( 'app:secret', require( 'crypto' ).randomBytes( 32 ).toString( 'hex' ) );
    if( update |= !data.app.jwtSecret ) config.set( 'app:jwtSecret', require( 'crypto' ).randomBytes( 32 ).toString( 'hex' ) );
    if( update ) config.save();

    fs.outputJson( path.join( __dirname, 'config-public.json' ), {
        app: {host: config.get( 'app:baseUrl' )},
        api: {host: config.get( 'api:baseUrl' )},
        io: {host: config.get( 'io:baseUrl' )},
        env: config.get( 'env' ) || config.get( 'NODE_ENV' )
    }, err => err && console.error( err ) );
} );

const express = require( 'express' ),
    app = express(),
    favicon = require( 'serve-favicon' ),
    logger = require( './server/logger' ),
    middlewareApp = require( './server/middlewares' ),
    view = require( './server/view' ),
    router = require( './server/router' ),
    middlewareError = require( './server/middlewares/error' ),
    middlewareLogger = require( './server/middlewares/logger' ),
    middlewareSecurityHeaders = require( './server/middlewares/security-headers' ),
    middlewarePrivateApp = require( './server/middlewares/private-app' ),
    passport = require( 'passport' ),
    env = config.get( 'env' ) || process.env.NODE_ENV || 'production';

app.set( 'env', app.locals.env = env );
app.locals.baseUrl = config.get( 'app:baseUrl' );
_.defaults( app.locals, {
    app: {
        baseUrl: config.get( 'app:baseUrl' )
    },
    api: {
        baseUrl: config.get( 'api:baseUrl' )
    },
    io: {
        baseUrl: config.get( 'io:baseUrl' )
    }
} );
app.set( 'trust proxy', 'loopback' );
app.disable( 'x-powered-by' );

logger.info( `INIT APP base url: ${config.get( 'app:baseUrl' )}` );
logger.info( `INIT APP environment: ${app.get( 'env' )}` );


/* SERVICES */

/*  private app digest auth */
app.use( middlewarePrivateApp );

/*  static files */
app.use( '/build', express.static( path.join( __dirname, './public/build' ) ) );
app.use( '/images', express.static( path.join( __dirname, './public/images' ) ) );
app.use( '/locales', express.static( path.join( __dirname, './shared/locales' ) ) );
app.use( favicon( path.join( __dirname, './public/favicon.ico' ) ) );
logger.info( `INIT APP static /build` );
logger.info( `INIT APP static /images` );
logger.info( `INIT APP static /locales` );
logger.info( `INIT APP static /favicon` );

/* APP */
app.use( middlewareLogger.before );
// app.use( middlewareSecurityHeaders );
app.use( middlewareApp );
view( app );
router( app );
app.use( middlewareLogger.after );
app.use( middlewareError );

module.exports = app;