import _ from "lodash";

export const modes = {
    NORMAL: 'normal',
    NEW_POINT: 'new-point'
};

export const setMode = ( {dispatch}, mode ) => dispatch( 'SET_MODE', mode );
export const setReloadRequired = ( {dispatch} ) => dispatch( 'RELOAD_REQUIRED', true );
export const resetReloadRequired = ( {dispatch} ) => dispatch( 'RELOAD_REQUIRED', false );

