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

export function getGeoFeatures( options ) {
    return new Promise( function( resolve, reject ) {
        // if( !store.state.api.token ) return resolve( {} );
        request( 'get', `/v1/geo/features`, options )
            .then( res => resolve( res ) )
            .fail( res => reject( res.responseJSON ) );
    } );
}

export function getPointsByGroup( groupId, options ) {
    return new Promise( function( resolve, reject ) {
        // if( !store.state.api.token ) return resolve( {} );
        request( 'get', `/v1/geo/groups/${groupId}/points`, options )
            .then( res => resolve( res ) )
            .fail( res => reject( res.responseJSON ) );
    } );
}

export function deleteGroup( groupId ) {
    console.log( 'api', 'deleteGroup' );
    return new Promise( function( resolve, reject ) {
        request( 'delete', `/v1/geo/groups/${groupId}` )
            .then( res => resolve( res ) )
            .fail( res => reject( res.responseJSON ) );
    } );
}

export function deleteFeature( featureId ) {
    return new Promise( function( resolve, reject ) {
        request( 'delete', `/v1/geo/features/${featureId}` )
            .then( res => resolve( res ) )
            .fail( res => reject( res.responseJSON ) );
    } );
}

export function addFeature( feature ) {
    return new Promise( function( resolve, reject ) {
        request( 'post', `/v1/geo/features`, feature )
            .then( res => resolve( res ) )
            .fail( res => reject( res.responseJSON ) );
    } );
}