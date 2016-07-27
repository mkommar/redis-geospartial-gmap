import Vue from "vue";
import Vuex from "vuex";
import mutations from "./mutations";
import * as config from "../../../config-public.json";
import modal from "./modules/modal";
import map from "./modules/map";
import points from "./modules/points";
import nearby from "./modules/nearby";

Vue.use( Vuex );

export default new Vuex.Store( {
    state: {
        config: config,
        api: {
            ready: true,
            loading: false,
            token: ''
        },
        mode: 'initial',
        reloadRequired: false,
        route: {path: ''}
    },
    mutations,
    modules: {
        map,
        points,
        nearby,
        modal
    },
    strict: config.env === 'development'
} );