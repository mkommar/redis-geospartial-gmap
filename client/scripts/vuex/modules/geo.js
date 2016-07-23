import {API_DATA_LOADING, API_DATA_READY, SHOW_MODAL, GEO_FEATURES, GEO_POINTS_BY_GROUP} from "../mutation-types";
import * as api from "../../api";

const state = {
    features: {
        items: [],
        geo: {
            groups: []
        }
    },
    pointsByGroup: {
        items: []
    }
};

const mutations = {
    [GEO_FEATURES] ( state, list ) { state.features = list },
    [GEO_POINTS_BY_GROUP] ( state, list ) { state.pointsByGroup = list }
};

export default {
    state,
    mutations
}

export const getGeoFeatures = ( {dispatch}, options ) => {
    dispatch( API_DATA_LOADING );
    return api.getGeoFeatures( options )
        .then( ( list ) => {
            dispatch( GEO_FEATURES, list );
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
};

export const getPointsByGroup = ( {dispatch}, options ) => {
    dispatch( API_DATA_LOADING );
    return api.getPointsByGroup( options )
        .then( ( list ) => {
            dispatch( GEO_POINTS_BY_GROUP, list );
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
};

export const deleteGroup = ( {dispatch}, groupId ) => {
    dispatch( API_DATA_LOADING );
    return api.deleteGroup( groupId )
        .then( () => {
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
};

export const deleteFeature = ( {dispatch}, featureId ) => {
    dispatch( API_DATA_LOADING );
    return api.deleteFeature( featureId )
        .then( () => {
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
};

export const addFeature = ( {dispatch}, feature ) => {
    dispatch( API_DATA_LOADING );
    return api.addFeature( feature )
        .then( () => {
            dispatch( API_DATA_READY );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
};