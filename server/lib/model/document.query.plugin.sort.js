'use strict';

function parse( cmd, level, callback ) {
    const field = this.model.schema.properties[cmd[2]];

    /* sort by string index */
    if( field.type === String )
    {
        throw new Error( 'not refactored' );
        const sortByStore = `${this.prefixes.sortedString}:${cmd[2]}`,
            order = this.query.order === 'desc' ? 'DESC' : 'ASC',
            offset = this.query.limit && Number( this.query.limit.offset ) || 0,
            limit = this.query.limit && Number( this.query.limit.count ) || -1,
            query = [
                [`${this.type[0]}card`, this.store],
                [
                    'sort', this.store, 'BY', `${sortByStore}:*`, 'ALPHA',
                    order,
                    'LIMIT', offset, limit
                ]
            ];
        // return _.assign( {}, options, {
        //     stack: _.concat( this.stack, query ),
        //     store: this.store,
        //     type: 'list'
        // } );
    }
    /* sort by numeric index */
    else
    {
        const sortedStore = this.model.ns + ':index:' + cmd[2],
            resultStore = this.tempStoreKey( [this.store, sortedStore] ),
            store = this.queryTreeParser( cmd[1], 1 );

        this.stores.tail.type = 'zset';
        // return ['zinterstore', resultStore, 2, this.store, sortedStore, 'WEIGHTS', 0, 1].join( ' ' );
        this.stack.push( ['zinterstore', resultStore, 2, store, sortedStore, 'WEIGHTS', 0, 1] );
        console.log( 'LEVEL', level );
        return callback( null, resultStore );
    }
}

module.exports = {
    parse
};