import * as api from "../api";
import i18next from "i18next";
import i18nXhr from "i18next-xhr-backend";
import cookies from "js-cookie";
import io from "socket.io-client";
import {CURRENT_USER, API_TOKEN, LANG, SHOW_MODAL} from "./mutation-types";

const i18nextInit = new Promise( function( resolve ) {
    i18next.use( i18nXhr ).init( {
        load: 'languageOnly',
        fallbackLng: 'en'
    }, resolve );
} );

export const setAuthToken = ( {dispatch}, token ) => {
    return new Promise( function( resolve ) {
        dispatch( API_TOKEN, token );
        resolve();
    } );
};

export const switchLang = ( {dispatch}, lang ) => {
    return i18nextInit.then( () => new Promise( function( resolve, reject ) {
        i18next.changeLanguage( lang, ( err ) => {
            if( err ) return reject( err );
            cookies.set( 'lang', lang );
            dispatch( LANG, lang );
            document.documentElement.setAttribute( 'lang', lang );
            resolve();
        } );
    } ) );
};

export const getCurrentUser = ( {dispatch} ) => {
    return api.getCurrentUser()
        .then( currentUser => {
            dispatch( CURRENT_USER, currentUser );
        } )
        .catch( ( err ) => {
            const modalContent = '<pre>' + JSON.stringify( err, null, '\t' ) + '</pre>';
            dispatch( SHOW_MODAL, 'Oops... API error', modalContent );
        } );
};

export const socketConnect = ( {state} ) => {
    return new Promise( function( resolve ) {
        return resolve();
        const socket = io.connect( state.config.io.host, {
            transports: ['websocket']
        } );
        socket.on( 'error', function( error ) {
            console.error( 'SOCKET ERROR', error );
        } );
        socket.on( 'connect', ()=> {
            console.log( 'SOCKET CONNECTED' );

            /*  socket.on( '<ns>:<event>', function( {obj} ) {
             *      dispatch( MUTATION, obj );
             *  } );
             *
             *  socket.on( `user:${state.user.id}:<event>`, function( {obj} ) {
             *      dispatch( MUTATION, obj );
             *  } );
             *
             *  /!* subscribe to public channel *!/
             *  socket.emit( 'subscribe', 'public:<ns>:<event>' );
             *
             *  /!* subscribe to private user channel *!/
             *  socket.emit( 'subscribe', `private:user:${state.user.id}:<event>`, state.api.token );
             */

            resolve();
        } );
        socket.on( 'disconnect', ()=> {
            console.log( 'SOCKET DISCONNECTED' );
        } );
    } );
};