const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    lib = {};

lib.processHook = function( schema, hookName, data, callback ) {
    async.forEach( _.concat( schema.keys.all, schema.keys.virtual ), function( propertyName, callback ) {
        const property = schema.properties[propertyName];
        if( !_.isFunction( property[hookName] ) ) return callback();
        property[hookName]( data[propertyName], data, callback );
    }, callback );
};

lib.processSubModel = function( schema, data ) {
    _.forEach( schema.keys.all, function( propertyName ) {
        const modelSub = schema.properties[propertyName].model;
        if( !modelSub ) return;
        const isPrimaryIndex = modelSub.index && modelSub.index.primary,
            submodel = data[propertyName];
        _.set( data, propertyName, _.pick( submodel || {}, isPrimaryIndex ? ['id', modelSub.index.primary] : ['id'] ) );
    } );
};

lib.export = function( schema ) {
    return _.transform( schema.properties, function( result, val, key ) {
        result[key] = {
            type: Object.prototype.toString.call( val.type() ).replace( '[object ', '' ).replace( ']', '' )
        };
    }, {} );
};

module.exports = lib;