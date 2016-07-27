'use strict';

const _ = require( 'lodash' ),
    error = require( '../error' ),
    config = require( '../config' ),
    controller = {};

controller.index = function( req, res, next ) {
    res.format( {
        'text/html': function() {
            res.render( 'index',
                {locals: _.pick( req.app.locals, ['env', 'baseUrl'] )},
                ( err, html ) => {
                    if( err ) return next( err );
                    res.status( 200 ).end( html ); 
                    next();
                }
            );
        },
        'default': function() {
            next( error.http( 406 ) );
        }
    } );
};

module.exports = controller;