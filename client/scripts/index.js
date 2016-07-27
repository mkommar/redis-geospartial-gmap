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
import {init as mdlInit} from "./mdl";
import VueMdl from "../components/vue-mdl/src/vue-mdl";
import VueIcon from "vue-icons/icon";
console.log(1211);
sync( store, router );
Vue.config.debug = true;
Vue.config.devtools = true;
Vue.use( VueMdl );
Vue.component( 'icon', VueIcon );

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

document.addEventListener( 'DOMContentLoaded', () => {
    router.start( App, '#app' );
} );