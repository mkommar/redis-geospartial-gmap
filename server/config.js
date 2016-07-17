'use strict';

const nconf = require( 'nconf' ),
    fse = require( 'fs-extra' ),
    path = require( 'path' ),
    defaultsPath = path.resolve( __dirname, '../config.defaults.json' ),
    configPath = path.resolve( __dirname, '../config.json' );

fse.ensureFileSync( defaultsPath );
fse.ensureFileSync( configPath );
!fse.readJsonSync( defaultsPath, {throws: false} ) && fse.outputJsonSync( defaultsPath, {} );
!fse.readJsonSync( configPath, {throws: false} ) && fse.outputJsonSync( configPath, {} );

nconf
    .argv()
    .env( ['NODE_ENV'] )
    .file( configPath )
    .defaults( fse.readJsonSync( defaultsPath, {throws: false} ) );

module.exports = nconf;