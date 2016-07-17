'use strict';

const i18next = require( 'i18next' ),
    SyncFsBackend = require( 'i18next-sync-fs-backend' ),
    LanguageDetector = require( 'i18next-express-middleware' ).LanguageDetector,
    path = require( 'path' );

i18next
    .use( SyncFsBackend )
    .use( LanguageDetector )
    .init( {
        //debug: true,
        load: ['en', 'ru', 'dev'],
        fallbackLng: 'dev',
        saveMissing: true,
        detection: {
            order: [/*'path', 'session', 'querystring',*/ 'cookie', 'header'],
            lookupCookie: 'lang'
        },
        backend: {
            loadPath: path.join( __dirname, "../shared/locales/{{lng}}/{{ns}}.json" ),
            addPath: path.join( __dirname, "../shared/locales/{{lng}}/{{ns}}.missing.json" ),
            jsonIndent: 2
        }
    } );

module.exports = i18next;