import {
    API_DATA_LOADING,
    API_DATA_READY,
    SHOW_MODAL,
    POINTS,
    SELECT_POINT,
    UPDATE_NEW_POINT_VALUE,
    POINTS_RESET_SELECTED,
    POINTS_RESET_NEW
} from "../mutation-types";

import _ from "lodash";
import {PointResource} from '../../api/resources';

const state = {
    items: [],
    selected: null,
    newOne: null,
    queryString: ''
};

const mutations = {
    [POINTS]: ( state, {items} ) => state.items = items,
    [SELECT_POINT]: ( state, point ) => state.selected = point,
    [UPDATE_NEW_POINT_VALUE] ( state, path, val ) {
        if( !state.newOne ) state.newOne = {
            coordinates: {},
            properties: {}
        };
        _.set( state.newOne, path, val )
    },
    [POINTS_RESET_SELECTED]: ( state ) => state.selected = null,
    [POINTS_RESET_NEW]: ( state ) => state.newOne = null
};

export default {
    state,
    mutations
}

export const savePoint = ( {dispatch}, point ) => {
    dispatch( API_DATA_LOADING );
    const promise = PointResource.save( point );
    promise
        .then( () => {
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
    return promise;
};

export const deletePoint = ( {dispatch}, id ) => {
    dispatch( API_DATA_LOADING );
    const promise = PointResource.delete( {id} );
    promise
        .then( () => {
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
    return promise;
};

export const getPoint = ( {dispatch}, id ) => {
    dispatch( API_DATA_LOADING );
    return PointResource.get( {id} )
        .then( () => {
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
};

export const getPointsByRadius = ( {dispatch}, query ) => {
    dispatch( API_DATA_LOADING );
    const promise = PointResource.query( query );
    promise
        .then( ( {data} ) => {
            dispatch( POINTS, data );
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
    return promise;
};

export const resetSelected = ( {dispatch} ) => dispatch( 'POINTS_RESET_SELECTED' );
export const resetNewPoint = ( {dispatch} ) => dispatch( 'POINTS_RESET_NEW' );