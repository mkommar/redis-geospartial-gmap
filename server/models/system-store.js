'use strict';

var redis = require( '../redis' );

const _ = require( 'lodash' ),
    error = require( '../error' ),
    model = {
        name: 'system-store',
        ns: 'sst'
    };

model.get = ( key, callback ) => {
    model.redis.get( [model.ns, key].join( ':' ), callback )
};

model.set = ( key, value, callback ) => {
    model.redis.set( [model.ns, key].join( ':' ), value, callback )
};

model.getObj = ( key, callback ) => {
    redis.get( [model.ns, key].join( ':' ), ( err, res ) => {
        if( err ) return callback( error.tag( err, '1467494033963' ) );
        callback( null, JSON.parse( res ) );
    } )
};

model.setObj = ( key, value, callback ) => {
    redis.set( [model.ns, key].join( ':' ), JSON.stringify( value ), callback )
};

model.store = key => ({
    get: _.partial( model.get, key ),
    set: _.partial( model.set, key )
});

model.storeObj = key => ({
    get: _.partial( model.getObj, key ),
    set: _.partial( model.setObj, key )
});

model.init = function( options ) {
    if( options.redis ) redis = options.redis;
};

module.exports = model;