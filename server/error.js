const _ = require( 'lodash' ),
    httpStatus = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not found',
        406: 'Not Acceptable',
        410: 'Gone',
        420: 'Enhance Your Calm',
        500: 'Internal Server Error'
    },
    errors = {
        0: [500, 'System error'],
        1: [403, 'API key not found'],
        2: [403, 'Invalid API key'],
        3: [403, 'email is required'],
        4: [403, 'Token not found'],
        5: [403, 'Invalid API key, access token required'],
        6: [403, 'Invalid API key, refresh token required'],
        7: [403, 'You have no permission to access this resource'],
        8: [403, 'Refresh token required'],
        9: [403, 'Invalid url param'],

        10: [400, 'Primary key is required'],
        11: [404, 'Record not found'],

        200: [500, 'Origin API error'],

        400: [400, 'Bad Request'],
        403: [403, 'Forbidden'],
        500: [500, 'System error'],

        800: [500, 'G2A pay service unavailable'],
        801: [500, 'G2A pay service error']
    },
    systemErrors = {
        ENOENT: [500, 'No such file or directory']
    };

function systemError( serr, tag, metadata ) {
    var err = new Error( 'System error' );
    err.status = 500;
    err.description = systemErrors[serr.code] ? systemErrors[serr.code][1] : serr.message;
    err.code = serr.code;
    err.tag = [];
    if( tag ) err.tag.push( tag );
    if( metadata ) err.metadata = err.stack;
    return err;
}

module.exports = systemError;
module.exports.system = systemError;

module.exports.code = function( code, tag, metadata ) {
    var status = errors[code] ? errors[code][0] : 500,
        err = new Error( httpStatus[status] );
    err.status = status;
    err.description = errors[code] ? errors[code][1] : 'Unknown error';
    err.code = code;
    if( metadata ) err.metadata = metadata;
    return module.exports.tag( err, tag, 3 );
};

module.exports.custom = function( code, message, tag, metadata ) {
    var status = errors[code] ? errors[code][0] : 500,
        err = new Error( httpStatus[status] );
    err.description = message;
    err.code = code;
    if( metadata ) err.metadata = metadata;
    return module.exports.tag( err, tag, 3 );
};

module.exports.tag = function( err, tag, index ) {
    if( !err.tag ) err.tag = [];
    err.tag.push( [tag, _.trim( new Error().stack.split( '\n' )[index || 2].replace( 'at', '' ) )] );
    return err;
};

module.exports.http = function( status, description, metadata ) {
    var err = new Error( httpStatus[status] );
    err.status = status;
    err.description = description;
    if( metadata ) err.metadata = metadata;
    return err;
};