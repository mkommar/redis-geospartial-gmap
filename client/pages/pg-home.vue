<template>
    <div class="wrapper">

        <!-- SIDEBAR -->
        <div class="sidebar ">
            <div class="sidebar-body mdl-grid mdl-grid--no-spacing">
                <div class="mdl-cell sidebar-item" v-if="mode=='normal'">
                    <vcu-selected-point></vcu-selected-point>
                </div>
                <div class="mdl-cell sidebar-item" v-if="mode=='normal'">
                    <vcu-find-nearby></vcu-find-nearby>
                </div>
                <div class="mdl-cell sidebar-item" v-if="mode=='new-point'">
                    <vcu-new-point-form></vcu-new-point-form>
                </div>
                <div class="mdl-cell sidebar-item mdl-cell--bottom" v-if="mode=='normal'">
                    <vcu-add-point-button></vcu-add-point-button>
                </div>
            </div>

            <div class="sidebar-shadow mdl-shadow--8dp"></div>
        </div>

        <!-- MAP LAYOUT -->
        <div class="container">
            <!-- MAP -->
            <vcu-map></vcu-map>
        </div>
    </div>
</template>

<script lang="babel">
    import _ from "lodash";
    import qs from "qs";

    import VcuMap from '../components/vcu-map.vue';
    import VcuSelectedPoint from '../components/sidebar/vcu-selected-point.vue';
    import VcuAddPointButton from '../components/sidebar/vcu-add-point-button.vue';
    import VcuNewPointForm from '../components/sidebar/vcu-new-point-form.vue';
    import VcuFindNearby from '../components/sidebar/vcu-find-nearby.vue';

    import {
            getPointsByRadius as actionGetPointsByRadius,
            resetSelected as resetSelectedPoint
    } from "../scripts/vuex/modules/points";

    import {setMode, modes, resetReloadRequired} from "../scripts/vuex/actions";

    export default {
        vuex: {
            getters: {
                mapRadius: ( {map} ) => map.radius,
                mapLoaded: ( {map} ) => map.loaded,
                mapCenter: ( {map} ) => map.center,
                mapZoom: ( {map} ) => map.zoom,
                mapClickable: ( {map} ) => map.clickable,
                mapDraggable: ( {map} ) => map.draggable,
                mapLayer: ( {map} ) => map.layer,

                apiLoading: ( {api} ) => api.loading,

                nearbyCenter: ( {nearby} ) => nearby.center,
                nearbyRadius: ( {nearby} ) => nearby.radius,
                nearbyUnits: ( {nearby} ) => nearby.units,

                query: ( {route} ) => route.query,

                mode: ( {mode} ) => mode,
                reloadRequired: ( {reloadRequired} ) => reloadRequired
            },
            actions: {
                actionGetPointsByRadius,
                actionSetMapLoaded: ( {dispatch} ) => dispatch( 'MAP_LOADED' ),
                setMode,
                resetSelectedPoint,
                resetReloadRequired
            }
        },
        watch: {
            mapLoaded(){
                if( !_.isEmpty( this.query ) )
                {
                    const query = qs.parse( this.query );
                }

                this.$router.go( this.$options.filters.qs( {
                    georadius: {
                        coordinates: this.mapCenter,
                        radius: this.nearbyRadius,
                        units: this.nearbyUnits,
                        limit: {
                            count: 1000
                        }
                    }
                } ) );

                this.setMode( modes.NORMAL );
            },
            reloadRequired( value ){
                if( !value ) return;
                this.resetReloadRequired();
                this.$router.go( {query: _.assign( {t: Date.now()}, _.cloneDeep( this.query ) )} );
            }
        },
        components: {
            VcuMap,
            VcuSelectedPoint,
            VcuAddPointButton,
            VcuNewPointForm,
            VcuFindNearby
        },
        route: {
            data ( {to, next} ) {
                if( _.isEmpty( to.query ) ) return;
                this.actionGetPointsByRadius( qs.parse( to.query ) ).then( () => {
                    next();
                } );
            }
        },
        events: {
            reload(){
                this.$router.go( {query: _.clone( this.query )} )
            },
            click( componentName ){
                if( ~['vcu-map', 'vcu-nearby-radius'].indexOf( componentName ) )
                {
                    this.resetSelectedPoint();
                }
            }
        }
    }
</script>

<style lang="scss" scoped>
    @import "../styles/_exports";

    .wrapper {
        display        : flex;
        flex-direction : row;
        flex           : 1;
    }

    .sidebar {
        flex     : 0 0 300px;
        position : relative;
    }

    .sidebar-body {
        position       : absolute;
        z-index        : 2;
        top            : 0;
        bottom         : 0;
        min-width      : 100%;
        display        : flex;
        flex-direction : column;
        flex-wrap      : nowrap;
    }

    .sidebar-item {
        display          : flex;
        flex-direction   : column;
        width            : 300px;
        min-height       : 0;
        max-height       : 100%;
        padding          : 8px;
        /*overflow         : auto;*/
        > div {
            width : 100%;
        }
    }

    .container {
        flex     : 1;
        position : relative;
    }

    .sidebar-shadow {
        position : absolute;
        z-index  : 1;
        top      : 0;
        left     : 0;
        right    : 0;
        bottom   : 0;
    }

    .button-delete {
        color : #212121;
    }

    .properties-list {
        list-style : none;
        li {
            padding-bottom : 16px;
        }
        .item-title {
            font-size      : 16px;
            font-weight    : 500;
            padding-bottom : 4px;
            display        : inline-block;
        }
    }

    .group-points-list {
        /*flex       : 1;*/
        overflow    : auto;
        flex-grow   : 1;
        flex-shrink : 1;
        max-height  : 300px;
    }

    .nearby__area-checkbox {
        padding-top : 4px;
    }
</style>

