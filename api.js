'use strict';

const config = require( './server/config' ),
    express = require( 'express' ),
    app = express(),
    logger = require( './server/logger' ),

    cors = require( 'cors' ),
    bodyParser = require( 'body-parser' ),
    passport = require( 'passport' ),
    passportStrategies = require( './server/middlewares/passport' ),

    middlewareError = require( './server/middlewares/error' ),
    middlewareLogger = require( './server/middlewares/logger' ),
    corsOptions = {
        origin: [config.get( 'api:cors:origin' ), 'https://www.gog.com'],
        maxAge: 1728000
    };

app.set( 'env', app.locals.env = (config.get( 'env' ) || config.get( 'NODE_ENV' )) );
app.locals.baseUrl = config.get( 'api:baseUrl' );
app.set( 'trust proxy', 'loopback' );
app.disable( 'x-powered-by' );
logger.info( `INIT base url: ${config.get( 'api:baseUrl' )}` );
logger.info( `INIT origin: ${config.get( 'api:cors:origin' )}` );
logger.info( `INIT environment: ${app.get( 'env' )}` );


/* APP */
app.use( function( req, res, next ) {
    req.data = {};
    res.data = {};
    res.model = {};
    res.forseJson = true;
    next();
} );

app.use( cors( corsOptions ) );
app.options( '*', cors( corsOptions ) );

app.use( middlewareLogger.before );

app.use( bodyParser.json( {limit: '5mb'} ) );
app.use( bodyParser.urlencoded( {extended: false} ) );
app.use( passport.initialize() );
passportStrategies( passport ).jwt();

app.use( '/v1', require( './server/routes/api-v1' ) );

app.use( middlewareLogger.after );
app.use( middlewareError );

module.exports = app;