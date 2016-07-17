'use strict';

var _ = require( 'lodash' ),
    error = require( '../error' ),
    modelUtil = {};

modelUtil.zipJson = function( obj, replacements ) {
    var json = JSON.stringify( obj );
    _.forEach( replacements || [], function( from, to ) {
        var re = new RegExp( '"' + from + '"', 'g' );
        json = json.replace( re, '"' + to + '"' );
    } );
    return json;
};

modelUtil.unzipJson = function( json, replacements ) {
    _.forEach( replacements, function( to, from ) {
        var re = new RegExp( '"' + from + '"', 'g' );
        json = json.replace( re, '"' + to + '"' );
    } );
    try
    {
        return JSON.parse( json );
    } catch( err )
    {
        console.error( err );
        return {};
    }
};

modelUtil.encodeProperty = function( field, value, jsonReplacements ) {
    if( field.type === Array )
    {
        return modelUtil.zipJson( value || [], jsonReplacements );
    }
    if( field.type == Object )
    {
        return modelUtil.zipJson( value || {}, jsonReplacements );
    }
    if( field.type == Number )
    {
        return value || 0;
    }
    if( field.type == String )
    {
        return value || '';
    }
    if( field.type == Boolean )
    {
        return Number( value || false );
    }
    return new Error( 'Unsupported type' );
};

modelUtil.zipKeys = function( obj, schema, jsonReplacements ) {
    return _.map( schema.keys.all, function( key ) {
        return modelUtil.encodeProperty( schema.properties[key], obj[key], jsonReplacements[key] );
    } );
};

modelUtil.unzipKey = function( schema, key, value, jsonReplacements ) {
    const property = schema.properties[key];
    if( !value || value === '' )
    {
        return value;
    }
    if( property.type === Array )
    {
        return modelUtil.unzipJson( value, jsonReplacements[key] );
    }
    if( property.type == Object )
    {
        return modelUtil.unzipJson( value, jsonReplacements[key] );
    }
    if( property.type == Number )
    {
        return Number( value );
    }
    if( property.type == String )
    {
        return value;
    }
    if( property.type == Boolean )
    {
        return Boolean( Number( value ) );
    }
    return new Error( 'Unsupported type' );
};

modelUtil.unzipKeys = function( list, schema, jsonReplacements ) {
    const fn = _.partial( modelUtil.unzipKey, schema, _, _, jsonReplacements );
    return _
        .chain( schema.keys.all )
        .map( ( key, index ) => [key, fn( key, list[index] )] )
        .fromPairs()
        .value();
};

modelUtil.decodeKey = function( key, model ) {
    var fieldName, path;

    if( ~key.indexOf( '.' ) )
    {
        let keyRe = /(.+?)\.(.+)/.exec( key );
        if( keyRe )
        {
            fieldName = keyRe[1];
            path = keyRe[2];
        }
    }
    else
    {
        fieldName = key;
    }

    const property = model.schema.properties[fieldName];
    if( !property ) throw new Error( `Unexistent model field '${fieldName}'` );

    return {
        name: fieldName,
        path: path || '',
        type: property.type,
        index: property.index,
        virtual: !!property.virtual,
        model: !!property.model,
        submodel: property.model,
        isIndexOfType: {
            sorted: model && model.index && model.index.sorted && ~model.index.sorted.indexOf( fieldName ),
            simple: model && model.index && model.index.simple && ~model.index.simple.indexOf( fieldName )
        }
    }
};

module.exports = modelUtil;