'use strict';

const express = require( 'express' ),
    router = express.Router(),
    mwUtil = require( '../middlewares/util' ),
    modelGeo = require( '../models/geo-v2' );

router.get( '/geo/points/:pointId([0-9]+)',
    mwUtil.loadAsync( modelGeo.getPoint, ['req.params.pointId'], 'res.data' ), 
    mwUtil.resValue( 'res.data' )
);
router.delete( '/geo/points/:pointId([0-9]+)',
    mwUtil.loadAsync( modelGeo.deletePoint, ['req.params.pointId'] ),
    mwUtil.resNoop( 204 )
);
router.post( '/geo/points',
    mwUtil.loadAsync( modelGeo.addPoint, ['req.body.coordinates', 'req.body.properties'] ),
    mwUtil.resNoop( 201 )
);

router.get( '/geo/points',
    mwUtil.typeCasting( {
        'req.query.georadius.coordinates.lat': Number,
        'req.query.georadius.coordinates.lng': Number,
        'req.query.georadius.radius': Number,
        'req.query.georadius.limit.count': Number
    } ),
    mwUtil.validateJsonSchema( {'req.query': {schema: modelGeo.schema.filter.georadius}} ),
    mwUtil.loadAsync( modelGeo.getPointsByRadius, [
        'req.query.georadius.coordinates',
        'req.query.georadius.radius',
        'req.query.georadius.units',
        'req.query.georadius.limit'
    ], 'res.data' ),
    mwUtil.resValue( 'res.data' )
);

module.exports = router;