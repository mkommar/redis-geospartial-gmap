'use strict';

const _ = require( 'lodash' ),
    logger = require( '../logger' );

logger.info( `INIT middleware logger` );

module.exports = {
    before: function( req, res, next ) {
        req.timestamp = Date.now();
        const reqData = {};
        if( !_.isEmpty( req.params ) ) reqData.params = req.params;
        if( !_.isEmpty( req.query ) ) reqData.query = req.query;
        if( !_.isEmpty( req.body ) ) reqData.query = req.body;
        logger.info( 'http req', req.path, _.isEmpty( reqData ) ? '' : reqData );
        next();
    },
    after: function( req, res, next ) {
        const time = Date.now() - req.timestamp;
        logger.info( 'http res', req.path, 200, time + 'ms' );
        next();
    }
};