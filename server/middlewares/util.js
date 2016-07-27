'use strict';

const _ = require( 'lodash' ),
    error = require( '../error' ),
    Validator = require( 'jsonschema' ).Validator,
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

middleware.resNoop = function( code ) {
    return function( req, res, next ) {
        res.status( code || 204 ).end();
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

middleware.validateJsonSchema = ( rules ) => {
    const validators = _.transform( rules, ( result, schema, entityKey ) => {
        const validator = new Validator();
        _.forEach( schema.refs || {}, ( schema, schemaId ) => {
            validator.addSchema( schema, 'schemaId' );
        } );
        result[entityKey] = function( entity ) {
            return validator.validate( entity, schema.schema );
        };
    }, {} );
    return function( req, res, next ) {
        const validationResult = _.transform( rules, ( result, schema, entityKey ) => {
            const entity = ~entityKey.indexOf( 'req.' )
                ? _.get( req, entityKey.replace( 'req.', '' ) )
                : _.get( res, entityKey.replace( 'res.', '' ) );
            if( !entity || _.isEmpty( entity ) ) return error.code( 400, '1469530804231' );
            result[entityKey] = validators[entityKey]( entity );
        }, {} );
        const errors = _.transform( validationResult, ( result, validationResult, entityKey ) => {
            if( !validationResult.errors.length ) return;
            result[entityKey] = validationResult.errors;
        }, {} );
        if( _.isEmpty( errors ) ) return next();
        next( error.code( 400, '1469536044075', errors ) );
    }
};

middleware.typeCasting = ( rules ) => {
    return function( req, res, next ) {
        _.forEach( rules, ( type, valueKey ) => {
            if( ~valueKey.indexOf( 'req.' ) )
            {
                const value = _.get( req, valueKey.replace( 'req.', '' ) );
                if( _.isUndefined( value ) ) return;
                _.set( req, valueKey.replace( 'req.', '' ), type( value ) );
            }
            else if( ~valueKey.indexOf( 'res.' ) )
            {
                const value = _.get( res, valueKey.replace( 'res.', '' ) );
                if( _.isUndefined( value ) ) return;
                _.set( res, valueKey.replace( 'res.', '' ), type( value ) );
            }
            else
            {
                throw new Error( `Invalid middleware typeCasting value key: ${valueKey}` )
            }
        } );
        next();
    }
};

module.exports = middleware;