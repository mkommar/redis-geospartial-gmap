import _ from "lodash";
import Vue from "vue";
import Vuex from "vuex";
import mutations from "./mutations";
import * as config from "../../../config-public.json";
import modal from "./modules/modal";
import platform from "platform";
import geo from "./modules/geo";

Vue.use( Vuex );

export default new Vuex.Store( {
    state: {
        user: {permissions: {}, tradeLink: ''},
        config: config,
        lang: '',
        api: {
            ready: true,
            loading: false,
            token: ''
        },
        redirectUrl: '',
        popupRedirectUrl: '',
        route: {path: ''},
        online: false,
        platform: _.cloneDeep( platform )
    },
    mutations,
    modules: {
        modal,
        geo
    },
    strict: config.env === 'development'
} );