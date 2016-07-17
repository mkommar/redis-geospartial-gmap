"use strict";

var async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    config = require( '../config' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    JwtStrategy = require( 'passport-jwt' ).Strategy,
    ExtractJwt = require( 'passport-jwt' ).ExtractJwt,
    DigestStrategy = require( 'passport-http' ).DigestStrategy,
    SteamStrategy = require( 'passport-steam' ).Strategy,
    GoogleStrategy = require( 'passport-google-oauth2' ).Strategy,
    FacebookStrategy = require( 'passport-facebook' ).Strategy,
    modelAccount = require( '../models/account' ),
    modelUser = require( '../models/user' );

function jwtStrategyMiddleware( payload, callback ) {
    if( !payload.id ) return callback( null, null );
    logger.info( 'passport jwt login', payload );
    callback( null, {id: payload.id} );
}

function digestStrategyMiddleware( username, callback ) {
    if( !username ) return callback( null, false );
    const users = config.get( 'app:private:users' );
    if( !users || !users.length ) throw new Error( 'Digest auth user list not defined' );
    const user = _.find( users, ['login', username] );
    if( !user || !user.password ) return callback( null, false );
    logger.info( `passport digest login, user=${username}` );
    callback( null, {login: username}, user.password );
}

function upsert( profile, callback ) {
    async.autoInject( {
        profile: [async.constant( profile )],
        account: ['profile', modelAccount.ensureAccount],
        user: ['account', modelUser.ensureUser],
        link: ['account', 'user', ( account, user, callback ) => {
            if( !~['steam'].indexOf( account.provider ) ) return callback();
            modelAccount.linkUser( account.id, user, callback );
        }]
    }, ( err, {user} ) => {
        if( err ) return callback( error.tag( err, '1466544304947' ) );
        callback( null, user );
    } );
}

function normalizeProfile( profile ) {
    return _.assign( {
        accountId: profile.provider + '-' + profile.id,
        provider: profile.provider,
        providerId: profile.id,
        avatarUrlS: profile.photos && profile.photos.length && profile.photos[0].value || '',
        avatarUrlM: profile.photos && profile.photos.length > 1 && profile.photos[1].value || '',
        avatarUrlL: profile.photos && profile.photos.length > 2 && profile.photos[2].value || '',
        // todo: more than one email?
        email: profile.email || profile.emails && profile.emails.length && profile.emails[0].value || ''
    }, _.pick( profile, ['displayName', 'email', 'gender'] ) );
}

function openIdStrategyMiddleware( req, identifier, profile, callback ) {
    upsert( normalizeProfile( _.assign( {provider: 'steam'}, profile ) ), callback );
    // todo: UI error message (express-flash, etc.)
}

function oauth2StrategyMiddleware( req, accessToken, refreshToken, profile, callback ) {
    upsert( normalizeProfile( profile ), callback );
    // todo: UI error message (express-flash, etc.)
}

module.exports = function( passport ) {
    return {
        session: function() {
            passport.serializeUser( function( user, callback ) {
                logger.info( `passport session store user=${user.id}` );
                callback( null, user.id );
            } );

            passport.deserializeUser( function( id, callback ) {
                logger.info( `passport session load user=${id}` );
                modelUser.getById( id, function( err, user ) {
                    if( err ) return callback( null, false );
                    callback( null, user );
                } );
            } );
        },
        jwt: function() {
            passport.use( new JwtStrategy( {
                    secretOrKey: config.get( 'app:jwtSecret' ),
                    jwtFromRequest: req => ExtractJwt.fromAuthHeader()( req )
                },
                jwtStrategyMiddleware
            ) );
        },
        digest: function() {
            passport.use( new DigestStrategy( {
                    qop: 'auth'
                },
                digestStrategyMiddleware
            ) );
        },
        /*
         *  Credentials:
         *      https://console.developers.google.com/
         *  Scopes:
         *      https://developers.google.com/identity/protocols/googlescopes
         */
        google: function() {
            passport.use( new GoogleStrategy( {
                    clientID: config.get( 'passport:google:clientId' ),
                    clientSecret: config.get( 'passport:google:clientSecret' ),
                    callbackURL: config.get( 'app:baseUrl' ) + '/auth/google/callback',
                    passReqToCallback: true
                },
                oauth2StrategyMiddleware
            ) );
        },
        /*
         *  Credentials:
         *      https://developers.facebook.com/quickstarts/?platform=web
         *  Scopes:
         *      https://developers.facebook.com/docs/facebook-login/permissions/overview
         */
        facebook: function() {
            passport.use( new FacebookStrategy( {
                    clientID: config.get( 'passport:facebook:clientId' ),
                    clientSecret: config.get( 'passport:facebook:clientSecret' ),
                    callbackURL: config.get( 'app:baseUrl' ) + '/auth/facebook/callback',
                    passReqToCallback: true,
                    profileFields: ['id', 'displayName', 'gender', 'photos', 'email']
                },
                oauth2StrategyMiddleware
            ) );
        }
    };
};

module.exports.upsert = upsert;