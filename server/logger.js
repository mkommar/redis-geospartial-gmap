const _ = require( 'lodash' ),
    winston = require( 'winston' ),
    logger = new (winston.Logger)( {
        transports: [
            new (winston.transports.Console)( {
                formatter: function( options ) {
                    var timestamp = new Date().toISOString().replace( /T/, ' ' ).replace( /Z/, '' ),//.replace( /\..+/, '' ),
                        pid = process.pid;
                    var message = winston.config.colorize( options.level, '[' + timestamp + ' ' + pid + '] ' );
                    if( options.meta instanceof Error )
                    {
                        message += options.meta.message;
                        message += '\n\t' + options.meta.stack;
                    }
                    else
                    {
                        if( options.message ) message += options.message;

                        if( options.message && !_.isEmpty( options.meta ) ) message += ', ';

                        message += _.transform( options.meta, function( result, value, key ) {
                            if( _.isObject( value ) ) return false;
                            result.push( key + ': ' + value );
                        }, [] ).join( ' | ' );

                        message += ' | ';
                        message += _.transform( options.meta, function( result, value, key ) {
                            if( result.length === 1 ) result.unshift( '' );
                            if( _.isPlainObject( value ) && _.keys( value ).length )
                            {
                                return result.push( key + ': ' + JSON.stringify( value ) );
                            }
                            if( _.isArray( value ) && value.length )
                            {
                                return result.push( key + ': ' + JSON.stringify( value ) );
                            }
                        }, [] ).join( '\n\t' );

                        if( options.meta.error instanceof Error )
                        {
                            message += '\n\t' + options.meta.error.stack;
                            if( options.meta.error.metadata ) message += '\n\t' + options.meta.error.metadata;
                        }
                    }
                    return _.trim( message, ' | ' );
                }
            } )
        ],
        colorize: true
    } );

//logger.error( 'dsfsf', {tag: 'trololo', error: new Error( 'Error message' )} );
//logger.error( {tag: 'trololo', error: new Error( 'Error message' )} );
//logger.info( 'sdfgsdg', 'sdfsd', 'sdfsfd', {test: 'ok', test2: [1, 2, 3], test3: {a: 1, b: 2, c: 3}} );

module.exports = logger;