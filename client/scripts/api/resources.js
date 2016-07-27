import Vue from 'vue';
import VueResource from 'vue-resource';
import * as config from "../../../config-public.json";
const API_ROOT = config.api.host;

Vue.use( VueResource );

export const PointResource = Vue.resource( API_ROOT + '/v2/geo/points{/id}' );
