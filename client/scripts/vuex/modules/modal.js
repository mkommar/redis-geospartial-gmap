import {SHOW_MODAL, HIDE_MODAL} from "../mutation-types";

const state = {
    visible: false,
    title: '',
    body: ''
};

const mutations = {
    [SHOW_MODAL] ( state, title, body ) {
        state.visible = true;
        state.title = title;
        state.body = body;
    },
    [HIDE_MODAL] ( state ) {
        state.visible = false;
        state.title = '';
        state.body = '';
    }
};

export default {
    state,
    mutations
}

export const showModal = ( {dispatch}, title, body ) => {
    dispatch( SHOW_MODAL, title, body );
};

export const hideModal = ( {dispatch} ) => {
    dispatch( HIDE_MODAL );
};