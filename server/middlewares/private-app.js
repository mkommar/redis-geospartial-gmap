'use strict';

const passport = require( 'passport' ),
    passportStrategies = require( './passport' );

passportStrategies( passport ).digest();

module.exports = [
    passport.authenticate( 'digest', {session: false} )
];