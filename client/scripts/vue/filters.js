import Vue from "vue";
import qs from "qs";

Vue.filter( 'qs', function( query ) {
    return '?' + qs.stringify( query, {encode: false, arrayFormat: 'brackets'} );
} );

Vue.filter( 'shortLatLng', {
    read: ( val ) => ({lat: val.latitude, lng: val.longitude}),
    write: ( val ) => ({latitude: val.lat, longitude: val.lng})
} );