'use strict';

const _ = require( 'lodash' ),
    hbs = require( 'hbs' ),
    hbsutils = require( 'hbs-utils' )( hbs ),
    fs = require( 'fs' ),
    path = require( 'path' );

function loadHelpers() {
    var helpers = fs.readdirSync( path.join( __dirname, '../shared/helpers' ) );
    _.forEach( helpers, function( helper ) {
        const helperName = helper.replace( '.js', '' ),
            helperFn = require( '../shared/helpers/' + helperName );

        if( _.isFunction( helperFn ) )
        {
            hbs.registerHelper( helperName, helperFn );
        }
    } );
}

function registerPartials( app ) {
    if( app.get( 'env' ) === 'development' )
    {
        hbsutils.registerWatchedPartials( path.resolve( __dirname, '../shared/views/partials' ) );
    }
    else
    {
        hbsutils.registerPartials( path.resolve( __dirname, '../shared/views/partials' ) );
    }
}

module.exports = function( app ) {
    app.set( 'views', path.resolve( __dirname, '../shared/views' ) );
    app.set( 'view engine', 'hbs' );

    loadHelpers();
    registerPartials( app );
    //hbs.localsAsTemplateData( app );
};