/*
 *
 * Source http://download.geonames.org/export/zip/
 *
 * Readme for GeoNames Postal Code files :
 *
 * This work is licensed under a Creative Commons Attribution 3.0 License.
 * This means you can use the dump as long as you give credit to geonames
 * (a link on your website to www.geoname.org is ok) see http://creativecommons.org/licenses/by/3.0/
 * UK: Contains Royal Mail data Royal Mail copyright and database right 2015.
 * The Data is provided "as is" without warranty or any representation of accuracy, timeliness or completeness.
 *
 * This readme describes the GeoNames Postal Code dataset.
 * The main GeoNames gazetteer data extract is here: http://download.geonames.org/export/dump/
 *
 * For many countries lat/lng are determined with an algorithm that searches the place names in the main geonames database
 * using administrative divisions and numerical vicinity of the postal codes as factors in the disambiguation of place names.
 * For postal codes and place name for which no corresponding toponym in the main geonames database could be found an average
 * lat/lng of 'neighbouring' postal codes is calculated.
 * Please let us know if you find any errors in the data set. Thanks
 *
 * For Canada we have only the first letters of the full postal codes (for copyright reasons)
 *
 * For Ireland we have only the first letters of the full postal codes (for copyright reasons)
 *
 * For Malta we have only the first letters of the full postal codes (for copyright reasons)
 *
 * The Argentina data file contains 4-digit postal codes which were replaced with a new system in 1999.
 *
 * For Brazil only major postal codes are available (only the codes ending with -000 and the major code per municipality).
 *
 * The data format is tab-delimited text in utf8 encoding, with the following fields :
 * country code      : iso country code, 2 characters
 * postal code       : varchar(20)
 * place name        : varchar(180)
 * admin name1       : 1. order subdivision (state) varchar(100)
 * admin code1       : 1. order subdivision (state) varchar(20)
 * admin name2       : 2. order subdivision (county/province) varchar(100)
 * admin code2       : 2. order subdivision (county/province) varchar(20)
 * admin name3       : 3. order subdivision (community) varchar(100)
 * admin code3       : 3. order subdivision (community) varchar(20)
 * latitude          : estimated latitude (wgs84)
 * longitude         : estimated longitude (wgs84)
 * accuracy          : accuracy of lat/lng from 1=estimated to 6=centroid
 */

'use strict';

const async = require( 'neo-async' ),
    _ = require( 'lodash' ),
    fs = require( 'fs' ),
    path = require( 'path' ),
    readline = require( 'readline' ),
    lib = {};

const modelGeo = require( '../models/geo' );

let counter = 0;

lib.fileToGeoJson = function( sourcePath, callback ) {
    const readStream = fs.createReadStream( sourcePath );

    const rl = readline.createInterface( {
        input: readStream
    } );

    const points = [];

    rl.on( 'line', ( line ) => {
        const data = line.split( '\t' );
        const [lon,lat]= [parseFloat( data[10] ), parseFloat( data[9] )];
        // if( !_.inRange( lon, 87.1875, 88.59375 ) || !_.inRange( lat, 69.10404213375, 69.76850407734375 ) )return;
        // if( !_.inRange( lon, 86.5390625, 88.890625 ) || !_.inRange( lat, 68.27015761964844, 70.43627310554687 ) ) return;
        const entity = {
            // type: 'Point',
            coordinates: [lon, lat],
            properties: {
                countryCode: data[0],
                postalCode: data[1],
                placeName: data[2],
                // adminName1: data[3],
                // adminCode1: data[4],
                // adminName2: data[5],
                // adminCode2: data[6],
                // adminName3: data[7],
                // adminCode3: data[8],
                accuracy: data[11]
            },
            dataset: 'geoname'
        };
        points.push( entity );
    } );

    rl.on( 'close', () => {
        async.eachSeries( points, ( point, callback ) => {
            modelGeo.upsert( point, err => {
                if( err ) return callback( err );
                counter++;
                if( !(counter % 5000 ) )
                {
                    console.log( 'Items added: ' + counter );
                }
                callback();
            } )
        }, err => {
            if( err ) return console.error( err );
            console.log( `Total ${counter} points was added` );
            process.exit( 0 );
        } );
    } );
};

// lib.fileToGeoJson( path.resolve( __dirname, '../../dev/RU.txt' ) );
lib.fileToGeoJson( path.resolve( __dirname, '../../dev/US.txt' ) );
// lib.fileToGeoJson( path.resolve( __dirname, '../../dev/allCountries.txt' ) );

module.exports = lib;