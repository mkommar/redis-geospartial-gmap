'use strict';

const config = require( './server/config' ),
    express = require( 'express' ),
    app = express(),
    logger = require( './server/logger' ),

    cors = require( 'cors' ),
    bodyParser = require( 'body-parser' ),

    middlewareError = require( './server/middlewares/error' ),
    middlewareLogger = require( './server/middlewares/logger' ),
    corsOptions = {
        origin: [config.get( 'api:cors:origin' )],
        maxAge: 1728000
    },
    env = config.get( 'env' ) || process.env.NODE_ENV || 'production';

app.set( 'env', app.locals.env = env );
app.locals.baseUrl = config.get( 'api:baseUrl' );
app.set( 'trust proxy', 'loopback' );
app.disable( 'x-powered-by' );
logger.info( `INIT API base url: ${config.get( 'api:baseUrl' )}` );
logger.info( `INIT API origin: ${config.get( 'api:cors:origin' )}` );
logger.info( `INIT API environment: ${app.get( 'env' )}` );


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

app.use( '/v2', require( './server/routes/api-v2' ) );

app.use( middlewareLogger.after );
app.use( middlewareError );

module.exports = app;