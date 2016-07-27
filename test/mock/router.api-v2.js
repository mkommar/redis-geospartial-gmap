'use strict';

const _ = require( 'lodash' ),
    express = require( 'express' ),
    app = express(),
    bodyParser = require( 'body-parser' );

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( {extended: false} ) );

app.use( '/v2', require( '../../server/routes/api-v2' ) );

app.use( function( err, req, res, next ) {
    if( !_.isError( err ) ) return next();
    const responseData = _.omitBy( {
        status: err.status || 500,
        message: err.message,
        description: err.description,
        code: err.code,
        tags: err.tag,
        metadata: err.metadata
    }, _.isNil );
    res.status( responseData.status ).json( responseData );
} );

module.exports = app;