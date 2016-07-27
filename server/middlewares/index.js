'use strict';

const bodyParser = require( 'body-parser' ),
    config = require( '../config' );

function parser() {
    return [
        bodyParser.json(),
        bodyParser.urlencoded( {extended: false} )
    ];
}

module.exports = [
    parser()
];