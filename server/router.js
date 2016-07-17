'use strict';

module.exports = function( app ) {
    app.use( '/', require( './routes/passport' ) );
    app.use( '/', require( './routes/index' ) );
};