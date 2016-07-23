import Vue from "vue";
import VueMoment from "vue-moment";
import i18next from "i18next";
import qs from "qs";

Vue.use( VueMoment );

Vue.filter( 't', function( value ) {
    return i18next.t( value );
} );

Vue.filter( 'qs', function( query ) {
    return '?' + qs.stringify( query, {encode: false, arrayFormat: 'brackets'} );
} );