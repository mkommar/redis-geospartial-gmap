'use strict';

const _ = require( 'lodash' );

function parse( cmd, level, callback ) {
    // if( cmd[0] === 'georadius' )

    if( cmd.length === 2 && !_.isArray( cmd[1] ) )
    {
        if( this.model.index && this.model.index.fulltext && ~this.model.index.fulltext.indexOf( cmd[0] ) )
        {
            const fulltextKeys = this.model.fulltextSearchKeys( cmd[1] ),
                resultKey = this.tempStoreKey( this.prefixes.temp, fulltextKeys );
            if( fulltextKeys.length === 0 ) return callback();
            // type = 'z';
            if( fulltextKeys.length === 1 ) return callback( null, fulltextKeys[0] );
            this.stack.push( ['zinterstore', resultKey, fulltextKeys.length].concat( fulltextKeys ) );
            return callback( null, resultKey );
        }
        else
        {
            const key = [this.prefixes.simple, cmd[0], this.getIndexValue( this.model, cmd[0], cmd[1] )].join( ':' );
            return callback( null, key );
        }
    }
}

module.exports = {
    parse
};