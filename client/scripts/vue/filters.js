import Vue from "vue";
import VueMoment from "vue-moment";
import i18next from "i18next";

Vue.use( VueMoment );

Vue.filter( 't', function( value ) {
    return i18next.t( value );
} );