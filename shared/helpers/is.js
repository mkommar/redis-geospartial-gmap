'use strict';

const ExpressionRegistry = function() {
    this.expressions = [];
};

ExpressionRegistry.prototype.add = function( operator, method ) {
    this.expressions[operator] = method;
};

ExpressionRegistry.prototype.call = function( operator, left, right ) {
    if( !this.expressions.hasOwnProperty( operator ) )
    {
        throw new Error( 'Unknown operator "' + operator + '"' );
    }

    return this.expressions[operator]( left, right );
};

const eR = new ExpressionRegistry;
eR.add( 'not', function( left, right ) {
    return left != right;
} );
eR.add( '>', function( left, right ) {
    return left > right;
} );
eR.add( '<', function( left, right ) {
    return left < right;
} );
eR.add( '>=', function( left, right ) {
    return left >= right;
} );
eR.add( '<=', function( left, right ) {
    return left <= right;
} );
eR.add( '===', function( left, right ) {
    return left === right;
} );
eR.add( '!==', function( left, right ) {
    return left !== right;
} );
eR.add( 'in', function( left, right ) {
    if( Object.prototype.toString.call( right ) !== '[object Array]' )
    {
        right = right.split( ',' );
    }
    return right.indexOf( left ) !== -1;
} );

const isHelper = function() {
    const args = arguments;
    let left = args[0],
        operator = args[1],
        right = args[2],
        options = args[3];

    if( args.length == 2 )
    {
        options = args[1];
        if( left ) return options.fn( this );
        return options.inverse( this );
    }

    if( args.length == 3 )
    {
        right = args[1];
        options = args[2];
        if( left == right ) return options.fn( this );
        return options.inverse( this );
    }

    if( eR.call( operator, left, right ) )
    {
        return options.fn( this );
    }
    return options.inverse( this );
};

module.exports = isHelper;