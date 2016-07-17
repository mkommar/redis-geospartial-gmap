'use strict';

const _ = require( 'lodash' ),
    error = require( '../error' ),
    middleware = {};

middleware.loadAsync = function( method, args, output, silent = false ) {
    const fn = _.spread( method );

    return function( req, res, next ) {
        function callback( err, data ) {
            if( err && !silent ) return next( error.tag( err, '1463254645360' ) );
            if( err && silent ) return next();
            if( output && output.indexOf( 'req.' ) === 0 ) _.set( req, output.replace( 'req.', '' ), data );
            if( output && output.indexOf( 'res.' ) === 0 ) _.set( res, output.replace( 'res.', '' ), data );
            next();
        }

        let _args =
            _.isArray( args ) && _.map( args || [], function( arg ) {
                if( arg.indexOf( 'req.' ) === 0 ) return _.get( req, arg.replace( 'req.', '' ) );
                if( arg.indexOf( 'res.' ) === 0 ) return _.get( res, arg.replace( 'res.', '' ) );
            } )
            || _.isFunction( args ) && args( {req, res} );

        fn( _.concat( _args, callback ) );
    }
};

middleware.resNoop = function() {
    return function( req, res, next ) {
        res.status( 204 ).end();
        next();
    }
};

middleware.resValue = function( path ) {
    return function( req, res, next ) {
        if( path.indexOf( 'req.' ) === 0 ) res.status( 200 ).json( _.get( req, path.replace( 'req.', '' ) ) );
        if( path.indexOf( 'res.' ) === 0 ) res.status( 200 ).json( _.get( res, path.replace( 'res.', '' ) ) );
        next();
    }
};

middleware.resAsync = function( method, args ) {
    const fn = _.spread( method );
    return function( req, res, next ) {
        fn( _.concat( args ? args( req, res ) : [], function( err, data ) {
            if( err ) return next( error.tag( err, '1464766875446' ) );
            res.status( 200 ).json( data );
            next();
        } ) );
    }
};

middleware.validation = function( rules ) {
    return function( req, res, next ) {
        if( !_.min( _.map( rules( req, res ), Boolean ) ) ) return next( error.code( 400, '1464734856562' ) );
        next();
    }
};

// [['userId',Number,false],['state',String,true]]
middleware.requiredQueryFields = function( fields ) {
    return function( req, res, next ) {
        res.status( 204 ).end();
        next();
    }
};

middleware.validatePagination = function( req, res, next ) {
    req.query.offset = _.gt( req.query.offset, 0 ) ? req.query.offset : 0;
    req.query.count = _.inRange( req.query.count, 1, 50 ) ? req.query.count : 10;
    next();
};

middleware.paramsUser = ( req, res, next ) => {
    if( req.params.userId === 'me' ) req.params.user = req.data.user = req.user;
    if( _.gt( req.params.userId, 0 ) ) req.params.user = req.data.user = {id: req.params.userId};
    next();
};

module.exports = middleware;