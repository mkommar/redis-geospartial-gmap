'use strict';

/**
 * @constructor
 */
function ModelUser() {}

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    redis = require( '../redis' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    debug = require( 'debug' )( 'model:user' ),
    jwt = require( 'jsonwebtoken' ),
    ModelDocument = require( '../lib/model/document' ),
    schema = {
        properties: {
            userAccountId: {
                index: 0,
                type: String,
                scope: ['private', 'public']
            },
            displayName: {
                index: 1,
                type: String,
                updatable: true,
                scope: ['private', 'public']
            },
            avatarUrlS: {
                index: 2,
                type: String,
                updatable: true,
                scope: ['private', 'public']
            },
            avatarUrlM: {
                index: 3,
                type: String,
                updatable: true,
                scope: ['private', 'public']
            },
            avatarUrlL: {
                index: 4,
                type: String,
                updatable: true,
                scope: ['private', 'public']
            },
            roles: {
                index: 5,
                type: Array,
                default: ['user'],
                scope: ['private']
            },
            createdAt: {
                index: 6,
                type: Number,
                default: function() {
                    return Date.now();
                },
                scope: ['private']
            },
            updatedAt: {
                index: 7,
                type: Number,
                updatable: true,
                onUpdate: function( value, context, callback ) {
                    context.updatedAt = Date.now();
                    callback();
                },
                scope: ['private']
            },
            tosAccepted: {
                index: 8,
                type: Boolean,
                updatable: true,
                default: false,
                scope: ['private']
            },
            redirectBack: {
                index: 9,
                type: String,
                updatable: true,
                default: '',
                scope: ['private']
            }
        }
    },
    /**
     * @type {ModelDocument|ModelUser|{
     *      name: string,
     *      ns: string
     * }}
     */
    model = {
        name: 'user',
        ns: 'u',
        schema: schema,
        index: {
            primary: ['userAccountId']
        }
    };

ModelDocument( redis, model );

model.getToken = function( id, secret, callback ) {
    const key = [model.ns, 'jwt', id].join( ':' ),
        ttl = 3600; //1h
    redis.get( key, ( err, token ) => {
        if( err ) return callback( error.tag( err, '1466600201519' ) );
        if( token ) return callback( null, token );
        async.autoInject( {
            token: [callback => jwt.sign( {id}, secret, {}, callback )],
            save: ['token', ( token, callback ) => redis.batch( [['set', key, token], ['expire', key, ttl]] ).exec( callback )]
        }, ( err, {token} ) => {
            if( err ) return callback( error.tag( err, '1466600600222' ) );
            callback( null, token );
        } );
    } );
};

/**
 * @name ModelUser#ensureUser
 * @param account
 * @param callback
 */
model.ensureUser = function( account, callback ) {
    async.waterfall( [
        async.constant( _.defaults(
            {userAccountId: `${account.provider}-${account.providerId}`},
            account
        ) ),
        ( account, callback ) => {
            model.getByPrimary( account.accountId, ( err, user ) => {
                debug( `[ensureUser] user id=${user && user.id}` );
                if( err && err.code === 11 ) return callback( null, account, null );
                if( err ) return callback( error.tag( err, '1467942037097' ) );
                callback( null, account, user );
            } );
        },
        ( account, user, callback ) => {
            if( user ) return callback( null, user );
            debug( `[ensureUser] upsert` );
            debug( account );
            model.upsert( _.omit( account, ['id'] ), ( err, id ) => {
                debug( `[ensureUser] user id=${id}` );
                if( err ) return callback( error.tag( err, '1467944675747' ) );
                model.getById( id, callback );
            } );
        }
    ], callback );
};

module.exports = model;