'use strict';

const _ = require( 'lodash' ),
    path = require( 'path' ),
    logger = require( '../logger' ),
    error = require( '../error' );

logger.info( `INIT middleware error handler` );

module.exports = [
    ( req, res, next ) => {
        if( !res.headersSent ) return next( error.http( 404 ) );
        next();
    },
    ( err, req, res, next ) => {
        if( !err ) next();
        const time = Date.now() - req.timestamp,
            appPath = path.resolve( __dirname, '../..' ),
            stack = err.stack && _.chain( err.stack )
                    .split( '\n' )
                    .reject( line=>/(node_modules)/.test( line ) )
                    .reject( line=>/(server\/error\.js|middlewares\/error\.js|middlewares\/logger\.js)/.test( line ) )
                    .filter( line=>~line.indexOf( appPath ) )
                    .tail()
                    .value(),
            message = _.omitBy( {
                status: err.status || 500,
                message: err.message,
                description: err.description,
                code: err.code,
                tags: _.map( err.tag, _.property( '[1]' ) ),
                metadata: err.metadata,
                stack: stack //? '\n' + stack : null
            }, _.isNil ),
            response = req.app.locals.env === 'development' ? message : _.omit( message, ['tags', 'metadata'] );

        logger.error( 'http', req.path, 'res', message.status, time + 'ms', _.omit( message, ['status'] ) );

        res.status( message.status );

        (res.forseJson || req.xhr || ~req.headers.accept.indexOf( 'json' ))
            ? res.end( JSON.stringify( response, null, 2 ) )
            : res.render( 'index', {error: response, locals: req.app.locals} );
    }
];