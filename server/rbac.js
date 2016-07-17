'use strict';

const RBAC = require( 'rbac2' );

/**
 * @param req
 * @param req.user.id
 * @param req.profile.id
 * @param callback
 */
function isSelfProfile( req, callback ) {
    if( !req.user ) return callback( null, false );
    if( !req.profile || !req.profile.id ) return callback( null, false );
    if( req.user.id != req.profile.id ) return callback( null, false );
    return callback( null, true );
}

/**
 * @param req
 * @param req.user.id
 * @param callback
 */
// function isSelfQuery( req, callback ) {
//     if( !req.query || !req.query.userId ) return callback( null, true );
//     if( req.query.userId == req.user.id ) return callback( null, true );
//     return callback( null, false );
// }

/**
 * @param req
 * @param req.user.id
 * @param callback
 */
function isSelf( req, callback ) {
    if( !req.params || !req.params.userId ) return callback( null, false );
    if( req.params.userId === 'me' ) return callback( null, true );
    if( req.params.userId == req.user.id ) return callback( null, true );
    return callback( null, false );
}

var rules = [
        //{a: 'admin', can: 'admin permission'},
        {a: 'admin', can: 'access backend'},
        //{a: 'admin', can: 'add lot'},
        //{a: 'admin', can: 'bots management'},
        {a: 'admin', can: 'system management'},
        {a: 'user', can: 'view profile', when: isSelfProfile},

        //{a: 'admin', can: 'get self items'},
        //{a: 'user', can: 'get self items', when: isSelfQuery},

        {a: 'admin', can: 'model.user.write'},
        //{a: 'user', can: 'model.account.write', when: isSelf},
        //{a: 'user', can: 'model.user.tosAccepted.write', when: isSelf},
        //{a: 'user', can: 'model.user.redirectBack.write', when: isSelf},

        {a: 'user', can: 'model.user.read_private', when: isSelf},
        {a: 'user', can: 'model.user.read_public'},
        {a: 'admin', can: 'model.user.read_private'}

        //{a: 'admin', can: 'model.auction.read_private'},
        //{a: 'user', can: 'model.auction.read_public'},
        //{a: 'anonymous', can: 'model.auction.read_public'},
        //{a: 'user', can: 'model.user.read_public'},
        //{a: 'anonymous', can: 'model.user.read_public'},

        //{a: 'admin', can: 'model.paymentOrder.read'}
    ],
    rbac = new RBAC( rules );

module.exports = rbac;