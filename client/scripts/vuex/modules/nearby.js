import _ from "lodash";
import {
    RADIUS_SET_CENTER,
    UPDATE_NEARBY_VALUE,
    NEARBY_RESET
} from "../mutation-types";


const state = {
    visible: true,
    center: {lat: 0, lng: 0},
    radius: 10000,
    units: 'm',
    lockPosition: false,
    showArea: true
};

const mutations = {
    [RADIUS_SET_CENTER] ( state, center ) {
        state.center = center
    },
    [UPDATE_NEARBY_VALUE]: ( state, path, val ) => _.set( state, path, val ),
    [NEARBY_RESET] ( state ) {
        state.visible = false;
        state.center = {lat: 0, lng: 0};
    }
};

export default {
    state,
    mutations
}

export const setNearbyValue = ( {dispatch}, path, val ) => dispatch( 'UPDATE_NEARBY_VALUE', path, val );

export const lockPosition = ( {dispatch} ) => dispatch( 'UPDATE_NEARBY_VALUE', 'lockPosition', true );
export const unlockPosition = ( {dispatch} ) => dispatch( 'UPDATE_NEARBY_VALUE', 'lockPosition', false );

export const reset = ( {dispatch} ) => {
    dispatch( 'NEARBY_RESET' );
};

export const setCenter = _.debounce( function( {dispatch}, coordinates ) {
    dispatch( 'UPDATE_NEARBY_VALUE', 'center', coordinates );
}, 100 );