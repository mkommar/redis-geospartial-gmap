import Vue from "vue";
import VueRouter from "vue-router";

Vue.use( VueRouter );

const router = new VueRouter( {
    history: true,
    saveScrollPosition: true,
    linkActiveClass: 'active'
} );

router.map( {
    '/': {
        component: require( '../pages/pg-home.vue' )
    },
    '/login': {
        component: require( '../pages/pg-login.vue' )
    }
} );

export default router;