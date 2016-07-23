'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    express = require( 'express' ),
    passport = require( 'passport' ),
    router = express.Router(),
    logger = require( '../logger' ),
    error = require( '../error' ),
    config = require( '../config' ),
    mwAuth = require( '../middlewares/auth' ),
    mwRbac = require( '../middlewares/rbac' ),
    mwUtil = require( '../middlewares/unil' ),
    modelUser = require( '../models/user' ),
    modelAccount = require( '../models/account' ),
    modelGeo = require( '../models/geo' ),
    controllerApi = require( '../controllers/api-v1' );

const loadUser = function( req, res, next ) {
    if( req.user && req.user.id )
    {
        modelUser.getById( req.user.id, function( err, user ) {
            if( err ) return next( error.tag( err, '1465772717297' ) );
            req.user = user;
            next();
        } );
    }
    else
    {
        req.user = {roles: ['anonymous']};
        next();
    }
};

function validatePagination( req, res, next ) {
    req.query.offset = _.gt( req.query.offset, 0 ) ? req.query.offset : 0;
    req.query.count = _.inRange( req.query.count, 1, 50 ) ? req.query.count : 8;
    next();
}

router.get( '/users/:userId', mwAuth.jwt( {breakIfDenied: true} ), loadUser,
    mwRbac.canEx( ['model.user.read_public', 'model.user.read_private'], {breakIfDenied: true} ),
    mwUtil.validation( ( req, res ) => [_.gt( req.params.userId, 0 ) || req.params.userId === 'me'] ),
    ( req, res, next ) => {
        if( req.params.userId === 'me' ) req.params.userId = null;
        next();
    },
    mwUtil.loadAsync( modelUser.getById, ( {req} ) => req.params.userId || req.user.id, 'res.model.user' ),
    mwRbac.filterModelFields( modelUser, ( {res} )=>res.model.user ),
    mwUtil.resValue( 'res.model.user' )
);

router.get( '/users/:userId/accounts', mwAuth.jwt( {breakIfDenied: true} ), loadUser, mwUtil.paramsUser,
    mwUtil.loadAsync( modelAccount.getUserAccounts, ['req.params.user'], 'res.data' ),
    mwUtil.resValue( 'res.data' )
);

// todo: security, validation, permissions
/**
 * @api {post} /users/:userId/accounts Link account to user
 * @apiParam {String="steam","origin","gog","uplay","desura"} account.provider
 * @apiParam {String} account.providerId
 */
router.post( '/users/:userId/accounts', mwAuth.jwt( {breakIfDenied: true} ), loadUser, mwUtil.paramsUser,
    mwUtil.validation( ( req, res ) => [
        _.get( req.body, 'account.provider' ),
        _.get( req.body, 'account.providerId' )
    ] ),
    controllerApi.userAddAccount
);

// todo: security, validation, permissions
router.delete( '/users/:userId/accounts/:accountId', mwAuth.jwt( {breakIfDenied: true} ), loadUser,
    mwUtil.validation( ( req, res ) => [_.gt( req.params.userId, 0 ), req.params.accountId] ),
    function( req, res, next ) {
        modelAccount.setValue( req.params.accountId, 'user', {}, function( err ) {
            if( err ) return next( error.tag( err, '1466659742584' ) );
            res.status( 204 ).end();
        } );
    }
);

router.get( '/accounts/search', mwAuth.jwt( {breakIfDenied: true} ), loadUser,
    mwUtil.validation( ( req, res ) => [req.query.provider, req.query.search] ),
    mwUtil.loadAsync( modelAccount.search, ['req.query'], 'res.data' ),
    mwUtil.resValue( 'res.data' )
);

router.get( '/accounts/:accountId([0-9]+)', mwAuth.jwt( {breakIfDenied: true} ), loadUser,
    mwUtil.loadAsync( modelAccount.getById, ['req.params.accountId'], 'res.data' ),
    mwUtil.resValue( 'res.data' )
);

router.get( '/geo/features',
    ( req, res, next ) => {

        let {center, radius, units} = {
            center: (req.query.filter.center && req.query.filter.center.lng && req.query.filter.center.lat)
                ? req.query.filter.center
                : {lng: 0, lat: 0},
            radius: req.query.filter.radius || 100,
            units: req.query.filter.units || 'm'
        };
        // return next();

        // radius = 280100;

        modelGeo.query( {
            select: ['georadius', 'coord', [center.lng, center.lat], radius, 'm'],
            // limit: {
            //     offset: 0,
            //     count: 1000
            // },
            geo: {
                clustering: true
            },
            perfmon: true
        }, ( err, list ) => {
            if( err ) return next( error.tag( err, '1468846858650' ) );
            res.data = list;
            // console.log( _.omit( list, ['items', 'ids'] ) );
            console.log( 'total points', '\t', list.total || 0 );
            console.log( 'visible points', '\t', list.items.length );
            console.log( 'total groups', '\t', list.geo.groups.length );
            next();
        } );
    },
    mwUtil.resValue( 'res.data' )
);

router.get( '/geo/features/:pointId',
    ( req, res, next ) => {
        next();
    },
    mwUtil.resNoop()
);
router.delete( '/geo/features/:featureId',
    mwUtil.loadAsync( modelGeo.deleteFeature, ['req.params.featureId'] ),
    mwUtil.resNoop()
);
router.post( '/geo/features',
    mwUtil.loadAsync( modelGeo.upsert, ['req.body'] ),
    mwUtil.resNoop()
);

router.get( '/geo/groups/:groupId/points',
    mwUtil.loadAsync( modelGeo.pointsByGroup, ['req.params.groupId', 'req.query'], 'res.data' ),
    mwUtil.resValue( 'res.data' )
);
router.delete( '/geo/groups/:groupId',
    mwUtil.loadAsync( modelGeo.deleteGroup, ['req.params.groupId'] ),
    mwUtil.resNoop()
);

module.exports = router;