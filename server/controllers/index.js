'use strict';

const _ = require( 'lodash' ),
    i18next = require( 'i18next' ),
    error = require( '../error' ),
    config = require( '../config' ),
    controller = {};

controller.index = function( req, res, next ) {
    const responseData = _.assign(
        {locals: _.pick( req.app.locals, ['env', 'baseUrl', 'lang', 'csrftoken'] )},
        res.data
    );

    res.format( {
        'text/html': function() {
            i18next.changeLanguage( req.language );
            res.render( 'index', responseData, ( err, html ) => {
                if( err ) return next( err );
                res.status( 200 ).end( html );
                next();
            } );
        },
        'default': function() {
            next( error.http( 406 ) );
        }
    } );
};

controller.api = function( req, res, next ) {
    res.status( 200 ).json( res.data );
    next();
};

controller.apiNoop = function( req, res, next ) {
    res.status( 204 ).end();
    next();
};

controller.apiValue = function( key ) {
    return function( req, res, next ) {
        res.status( 200 ).json( _.get( res.data, key ) );
        next();
    }
};

controller.messages = function( req, res ) {
    const messages = [];
    var message;
    while( message = res.locals.flash.shift() )
    {
        messages.push( message );
    }
    res.json( messages );
};

module.exports = controller;