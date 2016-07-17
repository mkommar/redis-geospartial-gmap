'use strict';

const express = require( 'express' ),
    config = require( '../config' ),
    mwUtil = require( '../middlewares/unil' ),
    modelAccount = require( '../models/account' ),
    controller = {};

controller.userAddAccount = express.Router().use( [
    mwUtil.loadAsync( modelAccount.ensureAccount, ['req.body.account'], 'req.data.account' ),
    mwUtil.loadAsync( modelAccount.linkUser, ['req.data.account.id', 'req.data.user'] ),
    mwUtil.resNoop()
] );

module.exports = controller;