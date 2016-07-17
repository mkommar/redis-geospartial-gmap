'use strict';

/**
 * @constructor
 */
function ModelAccount() {}

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    redis = require( '../redis' ),
    logger = require( '../logger' ),
    error = require( '../error' ),
    debug = require( 'debug' )( 'model:account' ),
    serviceApi = {},
    modelDocument = require( '../lib/model/document' ),
    schema = {
        properties: {
            accountId: {
                index: 0,
                type: String,
                scope: ['private', 'public']
            },
            provider: {
                index: 1,
                type: String,
                updatable: true,
                scope: ['private', 'public'],
                enum: [
                    'google',
                    'facebook',
                    'steam',
                    'origin',
                    'gog',
                    'uplay'
                ]
            },
            providerId: {
                index: 2,
                type: String,
                updatable: true,
                scope: ['private', 'public']
            },
            displayName: {
                index: 3,
                type: String,
                updatable: true,
                scope: ['private']
            },
            email: {
                index: 4,
                type: String,
                updatable: true,
                scope: ['private']
            },
            avatarUrlS: {
                index: 5,
                type: String,
                updatable: true,
                scope: ['private']
            },
            avatarUrlM: {
                index: 6,
                type: String,
                updatable: true,
                scope: ['private']
            },
            avatarUrlL: {
                index: 7,
                type: String,
                updatable: true,
                scope: ['private']
            },
            user: {
                index: 8,
                type: Object,
                updatable: true,
                model: require( './user' ),
                autoload: false,
                scope: ['private']
            },
            createdAt: {
                index: 9,
                type: Number,
                default: function() {
                    return Date.now();
                },
                scope: ['private']
            },
            updatedAt: {
                index: 10,
                type: Number,
                updatable: true,
                onUpdate: function( value, context, callback ) {
                    context.updatedAt = Date.now();
                    callback();
                },
                scope: ['private']
            }
        }
    },
    /**
     * @type {ModelDocument|ModelAccount|{
     *      name: string,
     *      ns: string
     * }}
     */
    model = {
        name: 'account',
        ns: 'a',
        schema: schema,
        index: {
            primary: 'accountId',
            //sorted: ['createdAt', 'updatedAt'],
            simple: ['provider']
        }
    };

modelDocument.inject( redis, model );

/**
 * @name ModelAccount#getUserAccounts
 * @param user
 * @param callback
 */
model.getUserAccounts = ( user, callback ) => {
    model.query( {
        select: [`${model.ns}:u:${user.id}`]
    }, callback );
};

/**
 * @name ModelAccount#getAccountsByIds
 * @param ids
 * @param callback
 */
model.getAccountsByIds = ( ids, callback ) => {
    model.loadByIds( ids, callback );
};

/**
 * @name ModelAccount#linkUser
 * @param id
 * @param user
 * @param callback
 */
model.linkUser = function( id, user, callback ) {
    redis.sadd( `${model.ns}:u:${user.id}`, id, callback );
};

/**
 * @name ModelAccount#unlinkUser
 * @param id
 * @param user
 * @param callback
 */
model.unlinkUser = function( id, user, callback ) {
    redis.srem( `${model.ns}:u:${user.id}`, id, callback );
};

/**
 * @name ModelAccount#ensureAccount
 * @param account
 * @param callback
 */
model.ensureAccount = function( account, callback ) {
    async.waterfall( [
        async.constant( _.defaults(
            {accountId: `${account.provider}-${account.providerId}`},
            account
        ) ),
        ( account, callback ) => {
            model.getIdByPrimary( account.accountId, ( err, id ) => {
                debug( `[ensureAccount] ${account.accountId}` );
                debug( `[ensureAccount] get id=${id}` );
                if( err && err.code === 11 ) return callback( null, _.omit( account, ['id'] ) );
                if( err ) return callback( error.tag( err, '1467942037097' ) );
                callback( null, _.defaults( {id}, account ) );
            } );
        },
        ( account, callback ) => {
            if( account.id ) return callback( null, account, true );
            if( !serviceApi[account.provider] ) return callback( null, account, false );
            debug( `[ensureAccount] load` );
            serviceApi[account.provider].getAccount( account, ( err, account ) => {
                if( err ) return callback( error.tag( err, '1467945647859' ) );
                callback( null, account, false );
            } );
        },
        ( account, isExists, callback ) => {
            if( isExists ) return callback( null, account );
            debug( `[ensureAccount] upsert` );
            model.upsert( account, ( err, id ) => {
                if( err ) return callback( error.tag( err, '1467944675747' ) );
                callback( null, _.defaults( {id}, account ) );
            } );
        }
    ], callback );
};

/**
 * @name ModelAccount#search
 * @param account
 * @param callback
 */
model.search = function( account, callback ) {
    const api = serviceApi[account.provider];
    if( !api ) callback( error.custom( 400, 'Invalid provider', '1468000725353' ) );
    api.findUser( account.search, callback );
};

module.exports = model;