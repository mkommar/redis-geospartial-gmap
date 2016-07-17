const hbs = require( 'hbs' );

module.exports = function( value, print ) {
    return new hbs.handlebars.SafeString( JSON.stringify( value, null, print ? '\t' : '' ) );
};