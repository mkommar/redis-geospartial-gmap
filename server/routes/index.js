const express = require( 'express' ),
    router = express.Router(),
    controller = require( '../controllers/index' ),
    config = require( '../config' ),

    middlewaresIndex = [
        function( req, res, next ) {
            res.data = {};
            next();
        }
    ];

router.get( '*', middlewaresIndex, controller.index );

module.exports = router; 