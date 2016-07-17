import $ from "jquery";
import store from "../vuex/store";

function request( method, endpoint, data ) {
    const options = {
        async: true,
        crossDomain: true,
        type: method.toUpperCase(),
        url: store.state.config.api.host + endpoint,
        dataType: 'json',
        headers: {
            authorization: `JWT ${store.state.api.token}`
        }
    };
    if( method.toLowerCase() === 'get' )
    {
        options.data = data;
    }
    if( method.toLowerCase() === 'post' )
    {
        options.contentType = 'application/json';
        options.processData = false;
        options.data = JSON.stringify( data );
    }

    return $.ajax( options );
}

export function getCurrentUser() {
    return new Promise( function( resolve, reject ) {
        if( !store.state.api.token ) return resolve( {} );
        request( 'get', `/v1/users/me`, null )
            .then( res => resolve( res ) )
            .fail( res => reject( res.responseJSON ) );
    } );
}