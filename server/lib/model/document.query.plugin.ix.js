'use strict';

function parse( cmd, level, callback ) {
    function getIndexValue( model, index, value ) {
        const field = model.schema.properties[index];
        if( !field ) throw new Error( `Undefined index "${index}" of model ${model.name}` );
        if( field.model ) return Number( value.id || value );
        if( field.enum ) return field.enum.indexOf( value );
        return Number( value );
    }

    this.stores.tail.type = 'sset';
    const key = [this.prefixes.simple, cmd[1], getIndexValue( this.model, cmd[1], cmd[2] )].join( ':' );
    return callback( null, key );
}

module.exports = {
    parse
};