const _ = require( 'lodash' ),
    helmet = require( 'helmet' ),
    config = require( '../config' ),
    development = config.get( 'env' ) === 'development';

module.exports = [
    helmet.hidePoweredBy(),
    helmet.noSniff(),
    helmet.frameguard( {action: 'sameorigin'} ),
    helmet.xssFilter(),
    helmet.dnsPrefetchControl( {allow: true} ),
    helmet.hsts( {
        maxAge: 10886400000, //18*7*24*60*60*1000
        includeSubDomains: true,
        preload: true
    } ),
    helmet.contentSecurityPolicy( {
        directives: {
            defaultSrc: [`'self'`],
            scriptSrc: [`'self'`, `'unsafe-eval'`],
            styleSrc: [`'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com`],
            imgSrc: [`https:`, `data:`],
            fontSrc: [`https:`],
            connectSrc: [
                `'self'`,
                config.get( 'api:baseUrl' ),
                config.get( 'io:baseUrl' ),
                config.get( 'io:wsUrl' ),
                development && config.get( 'app:baseUrl' ).replace( /^http/, 'ws' )
            ]
            //reportUri: '/report-violation'
        },

        // Set to true if you only want browsers to report errors, not block them
        reportOnly: false,

        // Set to true if you want to blindly set all headers: Content-Security-Policy,
        // X-WebKit-CSP, and X-Content-Security-Policy.
        setAllHeaders: false,

        // Set to true if you want to disable CSP on Android where it can be buggy.
        disableAndroid: false,

        // Set to false if you want to completely disable any user-agent sniffing.
        // This may make the headers less compatible but it will be much faster.
        // This defaults to `true`.
        browserSniff: true
    } )
];