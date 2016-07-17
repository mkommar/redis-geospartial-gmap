'use strict';

const _ = require( 'lodash' ),
    crypto = require( 'crypto' ),
    natural = require( 'natural' ),
    metaphone = natural.Metaphone.process,
    stem = natural.PorterStemmer.stem,
    stopwords = natural.stopwords,
    debug = require( 'debug' )( 'redis:document:index:fulltext' ),
    error = require( '../../error' );

const util = {};

_.assign( util, {
    words ( str ){
        return String( str ).match( /\w+/g );
    },
    stem( words ) {
        var ret = [];
        if( !words ) return ret;
        for( var i = 0, len = words.length; i < len; ++i )
        {
            ret.push( stem( words[i] ) );
        }
        return ret;
    },
    stripStopWords ( words ){
        var ret = [];
        if( !words ) return ret;
        for( var i = 0, len = words.length; i < len; ++i )
        {
            if( ~stopwords.indexOf( words[i] ) ) continue;
            ret.push( words[i] );
        }
        return ret;
    },
    countWords ( words ){
        var obj = {};
        if( !words ) return obj;
        for( var i = 0, len = words.length; i < len; ++i )
        {
            obj[words[i]] = (obj[words[i]] || 0) + 1;
        }
        return obj;
    },
    metaphoneMap ( words ){
        var obj = {};
        if( !words ) return obj;
        for( var i = 0, len = words.length; i < len; ++i )
        {
            obj[words[i]] = metaphone( words[i] );
        }
        return obj;
    },
    metaphoneArray ( words ){
        var arr = [];
        var constant;

        if( !words ) return arr;

        for( var i = 0, len = words.length; i < len; ++i )
        {
            constant = metaphone( words[i] );
            if( !~arr.indexOf( constant ) ) arr.push( constant );
        }

        return arr;
    },
    metaphoneKeys ( key, words ){
        return util.metaphoneArray( words ).map( function( c ) {
            return key + ':w:' + c;
        } );
    }
} );

function fulltextSearchKeys( redis, model, queryString ) {
    const keyPrefix = `${model.ns}:ix:ft`;
    var words = util.stem( util.stripStopWords( util.words( queryString ) ) );
    return util.metaphoneKeys( keyPrefix, words );
}

function fulltextIndexQuery( redis, model, id, value ) {
    const keyPrefix = `${model.ns}:ix:ft`;
    var words = util.stem( util.stripStopWords( util.words( value ) ) );
    var counts = util.countWords( words );
    var map = util.metaphoneMap( words );
    var keys = Object.keys( map );

    const query = [];
    keys.forEach( function( word ) {
        query.push( ['zadd', keyPrefix + ':w:' + map[word], counts[word], id] );
        query.push( ['zadd', keyPrefix + ':o:' + id, counts[word], map[word]] );
    } );

    return query;
}

module.exports = {
    fulltextSearchKeys,
    fulltextIndexQuery
};