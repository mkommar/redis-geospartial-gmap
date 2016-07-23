'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    chai = require( 'chai' ),
    expect = chai.expect,
    redis = require( '../server/redis' ),
    ModelDocument = require( '../server/lib/model/document' ),
    config = require( '../config.json' );

redis.select( config.redis.databaseTest );

describe( 'model.document.index.query', function() {

    before( function( done ) {
        redis.flushdb( done );
    } );

    const schema = {
            properties: {
                user: {
                    index: 0,
                    type: Object,
                    model: {}
                },
                stateA: {
                    index: 1,
                    type: String,
                    enum: ['a', 'b', 'c']
                },
                stateB: {
                    index: 1,
                    type: String,
                    enum: ['d', 'e', 'f', 'g', 'h', 'i', 'j', 'k']
                },
                sorted: {
                    index: 2,
                    type: Number
                }
            }
        },
        model = {
            ns: 'test',
            schema: schema,
            index: {
                sorted: ['sorted'],
                simple: ['user', 'stateA', 'stateB']
            }
        },
        data = [
            {user: {id: 1}, stateA: 'a', stateB: 'd', sorted: 8},//1
            {user: {id: 1}, stateA: 'a', stateB: 'e', sorted: 7},//2
            {user: {id: 1}, stateA: 'b', stateB: 'f', sorted: 6},//3
            {user: {id: 1}, stateA: 'c', stateB: 'g', sorted: 5},//4
            {user: {id: 2}, stateA: 'a', stateB: 'h', sorted: 4},//5
            {user: {id: 2}, stateA: 'a', stateB: 'i', sorted: 3},//6
            {user: {id: 2}, stateA: 'b', stateB: 'j', sorted: 2},//7
            {user: {id: 2}, stateA: 'c', stateB: 'k', sorted: 1} //8
        ];

    ModelDocument( redis, model );

    it( 'should #upsert items', function( done ) {
        this.timeout( 60 * 1000 );
        //for( let i = 0; i < 100; i++ )
        //{
        //    data.push( {
        //        user: {id: _.random( 1, 2 )},
        //        stateA: _.sample( ['l', 'm', 'n', 'o', 'p', 'q', 'r'] ),
        //        stateB: _.sample( ['l', 'm', 'n', 'o', 'p', 'q', 'r'] ),
        //        sorted: _.random( 1, 10 )
        //    } );
        //}
        async.each( data, model.upsert, function( err ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test index set correctly', function( done ) {
        async.parallel( [
            ( callback )=> {redis.sismember( [model.ns, 'ix', 's', 'user', '1'].join( ':' ), 1, callback )},
            ( callback )=> {redis.sismember( [model.ns, 'ix', 's', 'user', '1'].join( ':' ), 5, callback )},
            ( callback )=> {redis.sismember( [model.ns, 'ix', 's', 'user', '2'].join( ':' ), 5, callback )},
            ( callback )=> {redis.sismember( [model.ns, 'ix', 's', 'user', '2'].join( ':' ), 1, callback )}
        ], function( err, res ) {
            if( err ) return console.error( err );
            expect( err || null ).to.be.null;
            expect( Boolean( res[0] ) ).to.be.true;
            expect( Boolean( res[1] ) ).to.be.false;
            expect( Boolean( res[2] ) ).to.be.true;
            expect( Boolean( res[3] ) ).to.be.false;
            done();
        } );
    } );

    it.skip( 'should detect memory leak', function( done ) {
        this.timeout( 60 * 60 * 1000 );
        async.eachSeries( _.range( 1000000 ), function( n, next ) {
            //console.time( 'query ' + n );
            model.query( {
                select: [
                    'union',
                    ['stateB', 'k'], //8
                    ['inter', ['user', 1], ['stateA', 'a']], //1,2
                    ['inter', ['user', 2], ['stateA', 'b']] //7
                ],
                sortBy: ['sorted'],
                order: 'asc',
                limit: {
                    offset: 0,
                    count: 100
                },
                idOnly: true
            }, function( err, res ) {
                //console.timeEnd( 'query ' + n );
                if( !((n + 10) % 5000 ) )
                {
                    global.gc();
                }
                if( !(n % 5000 ) )
                {
                    console.log( n, process.memoryUsage().rss );
                }
                expect( err || null ).to.be.null;
                expect( res ).to.be.eql( [8, 7, 2, 1] );
                next();
            } );
        }, function( err ) {
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test #range by simple index #1', function( done ) {
        model.query( {
            select: ['sort', ['union',
                ['ix', 'stateB', 'k'],                                  // 8
                ['inter', ['ix', 'user', 1], ['ix', 'stateA', 'a']],    // 1,2
                ['inter', ['ix', 'user', 2], ['ix', 'stateA', 'b']]     // 7
            ], 'sorted', {order: 'asc'}],
            limit: {
                offset: 0,
                count: 100
            },
            idOnly: true,
            cache: true
        }, function( err, res ) {
            expect( err || null ).to.be.null;
            expect( res.ids ).to.be.eql( [8, 7, 2, 1] );
            done();
        } );
    } );

    /**
     *      user:1
     *          11940aa1386d61ef27b8730f947c9912cd8f1c4f
     *          a4635f7e39287814895de03f802864732b3659d1
     *          64590639789b009e727e5acd77383084e4525451
     *      stateA:0
     *          11940aa1386d61ef27b8730f947c9912cd8f1c4f
     *          a4635f7e39287814895de03f802864732b3659d1
     *          64590639789b009e727e5acd77383084e4525451
     *
     *      user:2
     *          2191092c53058980ffe0b0b2baf19d4d30e9006b
     *          a4635f7e39287814895de03f802864732b3659d1
     *          64590639789b009e727e5acd77383084e4525451
     *      stateA:1
     *          2191092c53058980ffe0b0b2baf19d4d30e9006b
     *          a4635f7e39287814895de03f802864732b3659d1
     *          64590639789b009e727e5acd77383084e4525451
     *
     *      stateB:7
     *          a4635f7e39287814895de03f802864732b3659d1
     *          64590639789b009e727e5acd77383084e4525451
     */

    it.skip( 'should check index cache set correctly', function( done ) {
        const prefix = {
            index: 'test:ix:s',
            cache: 'test:ix:c',
            temp: 'test:ix:t:'
        };
        const query = [
            ['smembers', prefix.cache + ':user:1'],
            ['smembers', prefix.cache + ':stateA:0'],
            ['smembers', prefix.cache + ':user:2'],
            ['smembers', prefix.cache + ':stateA:1'],
            ['smembers', prefix.cache + ':stateB:7']
        ];

        redis.batch( query ).exec( function( err, res ) {
            expect( err || null ).to.be.null;
            expect( res[0] ).to.have.members( [
                '11940aa1386d61ef27b8730f947c9912cd8f1c4f',
                'a4635f7e39287814895de03f802864732b3659d1',
                '64590639789b009e727e5acd77383084e4525451'
            ] );
            expect( res[1] ).to.have.members( [
                '11940aa1386d61ef27b8730f947c9912cd8f1c4f',
                'a4635f7e39287814895de03f802864732b3659d1',
                '64590639789b009e727e5acd77383084e4525451'
            ] );
            expect( res[2] ).to.have.members( [
                '2191092c53058980ffe0b0b2baf19d4d30e9006b',
                'a4635f7e39287814895de03f802864732b3659d1',
                '64590639789b009e727e5acd77383084e4525451'
            ] );
            expect( res[3] ).to.have.members( [
                '2191092c53058980ffe0b0b2baf19d4d30e9006b',
                'a4635f7e39287814895de03f802864732b3659d1',
                '64590639789b009e727e5acd77383084e4525451'
            ] );
            expect( res[4] ).to.have.members( [
                'a4635f7e39287814895de03f802864732b3659d1',
                '64590639789b009e727e5acd77383084e4525451'
            ] );
            done();
        } );
    } );

    it( 'should test #query by simple index #2.1', function( done ) {
        model.query( {
            select: ['sort', ['union',
                ['ix', 'stateB', 'k'],                                                    // 8
                ['inter', ['ix', 'user', 1], ['ix', 'stateA', 'a']],                            // 1,2
                ['inter', ['ix', 'user', 1], ['ix', 'stateA', 'b']],                            // 3
                ['inter', ['ix', 'user', 2], ['inter', ['ix', 'stateA', 'b'], ['ix', 'stateB', 'j']]],// 7
                ['inter', ['ix', 'user', 2], ['ix', 'stateB', 'i']]                             // 6
            ], 'sorted', 'asc'],
            limit: {
                offset: 0,
                count: 100
            },
            idOnly: true,
            cache: true
        }, function( err, res ) {
            expect( err || null ).to.be.null;
            expect( res.ids ).to.be.eql( [8, 7, 6, 3, 2, 1] );
            done();
        } );
    } );

    it( 'should test #range by simple index #2.3 (cache on)', function( done ) {
        async.eachSeries( _.range( 100 ), function( n, next ) {
            model.query( {
                select: [
                    'union',
                    ['stateB', 'k'],                                                    // 8
                    ['inter', ['user', 1], ['stateA', 'a']],                            // 1,2
                    ['inter', ['user', 1], ['stateA', 'b']],                            // 3
                    ['inter', ['user', 2], ['inter', ['stateA', 'b'], ['stateB', 'j']]],// 7
                    ['inter', ['user', 2], ['stateB', 'i']]                             // 6
                ],
                sortBy: ['sorted'],
                order: 'asc',
                limit: {
                    offset: 0,
                    count: 100
                },
                idOnly: true
                //cache: true
            }, function( err, res ) {
                expect( res.ids ).to.be.eql( [8, 7, 6, 3, 2, 1] );
                next();
            } );
        }, function( err ) {
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test #range by simple index #2.3 (cache on)', function( done ) {
        async.eachSeries( _.range( 100 ), function( n, next ) {
            model.query( {
                batch: true,
                groupA: {
                    select: ['inter', ['user', 1], ['stateA', 'a']],                            // 1,2,
                    sortBy: ['sorted'],
                    order: 'asc',
                    limit: {
                        offset: 0,
                        count: 100
                    },
                    idOnly: true
                },
                groupB: {
                    select: ['inter', ['user', 2], ['stateB', 'i']],                             // 6
                    sortBy: ['sorted'],
                    order: 'asc',
                    limit: {
                        offset: 0,
                        count: 100
                    },
                    idOnly: true
                }
            }, function( err, res ) {
                expect( res.groupA.ids ).to.be.eql( [2, 1] );
                expect( res.groupB.ids ).to.be.eql( [6] );
                next();
            } );
        }, function( err ) {
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test #range by simple index #2.3 (load model)', function( done ) {
        async.eachSeries( _.range( 100 ), function( n, next ) {
            model.query( {
                batch: true,
                groupA: {
                    select: ['inter', ['user', 1], ['stateA', 'a']],                            // 1,2,
                    sortBy: ['sorted'],
                    order: 'asc',
                    limit: {
                        offset: 0,
                        count: 100
                    }
                },
                groupB: {
                    select: ['inter', ['user', 2], ['stateB', 'i']],                             // 6
                    sortBy: ['sorted'],
                    order: 'asc',
                    limit: {
                        offset: 0,
                        count: 100
                    }
                },
                groupC: {
                    select: ['inter', ['user', 2], ['stateB', 'k']],                             // 8
                    sortBy: ['sorted'],
                    order: 'asc',
                    limit: {
                        offset: 0,
                        count: 100
                    },
                    idOnly: true
                }
            }, function( err, res ) {
                expect( _.omit( res.groupA.ids[1], ['id'] ) ).to.be.eql( data[0] ); // 1
                expect( _.omit( res.groupA.ids[0], ['id'] ) ).to.be.eql( data[1] ); // 2
                expect( res.groupA.total ).to.be.equal( 2 );
                expect( _.omit( res.groupB.ids[0], ['id'] ) ).to.be.eql( data[5] ); // 6
                expect( res.groupB.total ).to.be.equal( 1 );
                expect( res.groupC.items ).to.be.eql( [8] );                          // 8
                next();
            } );
        }, function( err ) {
            expect( err || null ).to.be.null;
            done();
        } );
    } );

    it( 'should test #range by simple index without limit and sort', function( done ) {
        model.query( {
            select: ['stateA', 'a'],
            idOnly: true
        }, function( err, res ) {
            expect( err || null ).to.be.null;
            expect( res.items ).to.be.eql( [1, 2, 5, 6] );
            done();
        } );
    } );

    it( 'should test #range by simple index with groupBy', function( done ) {
        model.query( {
            select: ['stateA', 'a'],
            idOnly: true,
            groupBy: 'user'
        }, function( err, res ) {
            expect( err || null ).to.be.null;
            expect( res ).to.be.eql( {
                '1': {ids: [1, 2], total: 2, offset: 0, count: 2},
                '2': {ids: [5, 6], total: 2, offset: 0, count: 2}
            } );
            done();
        } );
    } );

    it( 'should test #range by simple index with groupBy', function( done ) {
        model.query( {
            select: ['stateA', 'a'],
            idOnly: true,
            groupBy: 'user',
            limit: {
                offset: 0,
                count: 1
            },
            sortBy: ['sorted']
        }, function( err, res ) {
            expect( err || null ).to.be.null;
            expect( res ).to.be.eql( {
                '1': {ids: [1], total: 2, offset: 0, count: 1},
                '2': {ids: [5], total: 2, offset: 0, count: 1}
            } );
            done();
        } );
    } );
} );