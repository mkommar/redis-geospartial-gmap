import {
    MAP_LOADED,
    MAP_CENTER
} from "../mutation-types";

const state = {
    radius: 1000,
    loaded: false,
    center: {
        lat: 32.310286886043485,
        lng: -64.75532816674809
    },
    zoom: 12,
    clickable: true,
    draggable: true,
    layer: 'terrain'
};

const mutations = {
    [MAP_LOADED] ( state ) { state.loaded = true },
    [MAP_CENTER] ( state, coordinates ) { state.center = coordinates }
};

export default {
    state,
    mutations
}