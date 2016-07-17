import {set} from "vue";
import _ from "lodash";
import * as types from "./mutation-types";

export default {
    [types.SET_CONFIG] ( state, config ) {
        set( state, 'config', config );
    },
    [types.API_TOKEN] ( state, token ) {
        state.api.token = token;
    },
    [types.CURRENT_USER] ( state, user ) {
        set( state, 'user', user );
    },
    [types.CURRENT_USER_UPDATE] ( state, update ) {
        _.assign( state.user, update );
    },
    [types.LANG] ( state, lang ) {
        set( state, 'lang', lang );
    },
    [types.API_DATA_LOADING] ( state ) {
        state.api.ready = false;
        state.api.loading = true;
    },
    [types.API_DATA_READY] ( state ) {
        state.api.ready = true;
        state.api.loading = false;
    }
}