import {
    SET_MODE,
    RELOAD_REQUIRED,
    API_DATA_LOADING,
    API_DATA_READY
} from "./mutation-types";

export default {
    [SET_MODE] ( state, mode ) {
        state.mode = mode;
    },
    [RELOAD_REQUIRED] ( state, value ) {
        state.reloadRequired = value;
    },
    [API_DATA_LOADING] ( state ) {
        state.api.ready = false;
        state.api.loading = true;
    },
    [API_DATA_READY] ( state ) {
        state.api.ready = true;
        state.api.loading = false;
    }
}