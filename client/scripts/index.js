'use strict';

import "../styles/index.scss";
import "babel-polyfill";
import "../components/pace";
import "./vue/filters";
import "./vue/directives";
import Vue from "vue";
import store from "./vuex/store";
import router from "./router";
import {sync} from "vuex-router-sync";
import cookies from "js-cookie";
import $ from "jquery";
import {init as mdlInit} from "./mdl";
import {setAuthToken, getCurrentUser, switchLang, socketConnect} from "./vuex/actions";
import VueMdl from "vue-mdl";
import VueIcon from "vue-icons/icon";

sync( store, router );

Vue.config.debug = true;
Vue.config.devtools = true;
Vue.use( VueMdl );
Vue.component( 'icon', VueIcon );

const init = setAuthToken( store, cookies.get( 'jwt' ) )
    .then( () => Promise.all( [
        getCurrentUser( store ),
        switchLang( store, cookies.get( 'lang' ) || 'en' )
    ] ) )
    .then( () => socketConnect( store ) );

if( module.hot )  module.hot.accept();

const App = Vue.extend( {
    store,
    components: {
        vcErrorPopup: require( '../components/vc-error-popup' ),
        prHeader: require( '../partials/pr-header' ),
        prDrawer: require( '../partials/pr-drawer' ),
        prFooter: require( '../partials/pr-footer' )
    },
    ready: function() {
        Vue.nextTick( mdlInit );
    }
} );

$( () => init
    .then( () => { router.start( App, '#app' ) } )
    .catch( console.error.bind( console ) )
);