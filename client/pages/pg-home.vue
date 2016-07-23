<template>
    <div class="wrapper">
        <div class="sidebar ">
            <div class="sidebar-body mdl-grid">
                <div class="mdl-cell mdl-card" v-if="selectedObject.type==='point'">
                    <div class="am-card-header">
                        <div class="mdl-card__title">
                            <span v-text="selectedObject.item.properties.placeName"></span>
                        </div>
                    </div>

                    <div class="mdl-card__supporting-text mdl-card--border">
                        <p>
                            <span>Point ID:</span>
                            <span v-text="selectedObject.item.id"></span>
                        </p>
                        <div>
                            <span>Coordinates:</span>
                            <span v-text="selectedObject.item.coordinates[1]"></span>
                            <span v-text="selectedObject.item.coordinates[0]"></span>
                        </div>
                        <p>
                            <span>Country code:</span>
                            <span v-text="selectedObject.item.properties.countryCode"></span>
                        </p>
                        <p>
                            <span>Postal code:</span>
                            <span v-text="selectedObject.item.properties.postalCode"></span>
                        </p>
                    </div>

                    <div class="mdl-card__actions mdl-card--border">
                        <mdl-button class="button-delete" v-mdl-ripple-effect @click="deletePoints(selectedObject)"
                                    :disabled="loading">
                            <icon class="icon" name="mdi-delete" size="20"></icon>
                            Delete point
                        </mdl-button>
                        <mdl-button class="button-delete" v-mdl-ripple-effect @click="findNearby(selectedObject)"
                                    :disabled="loading">
                            <icon class="icon" name="fa-search" size="20"></icon>
                            Find nearby
                        </mdl-button>
                    </div>
                </div>

                <div class="mdl-cell mdl-cell--12-col">
                    <vcu-find-nearby :nearby="nearby" @c-nearby_update="reloadFeatures"></vcu-find-nearby>
                </div>

                <div class="mdl-cell mdl-card" v-if="!selectedObject.type">
                    <mdl-button colored fab @click="showAddPointForm">+</mdl-button>
                </div>

                <div class="mdl-cell mdl-card" v-if="selectedObject.type=='new-point'">
                    <h3>New point</h3>
                    <mdl-textfield floating-label="Place name" :value.sync="newPoint.placeName"></mdl-textfield>
                    <mdl-textfield floating-label="Latitude" :value.sync="newPoint.lat"></mdl-textfield>
                    <mdl-textfield floating-label="Longitude" :value.sync="newPoint.lng"></mdl-textfield>

                    <mdl-button class="button-add" v-mdl-ripple-effect @click="addPoints(newPoint)"
                                :disabled="loading">
                        Add point
                    </mdl-button>
                </div>

                <div class="mdl-cell mdl-card mdl-cell--bottom" v-if="selectedObject.type==='group'">
                    <div class="am-card-header">
                        <div class="mdl-card__title">
                            <span>Group</span>
                        </div>
                    </div>
                    <div>
                        <span class="item-title">Total points:</span>
                        <span v-text="selectedObject.item.total"></span>
                    </div>

                    <ol class="mdl-card__supporting-text mdl-card--border group-points-list">
                        <li v-for="point in pointsByGroup.items" track-by="id" @click="selectedPoint=point">
                            <span v-text="point.id"></span>
                            <span v-text="point.properties.placeName"></span>
                        </li>
                    </ol>

                    <div class="mdl-card__actions mdl-card--border">
                        <mdl-button class="button-delete" v-mdl-ripple-effect @click="deletePoints(selectedObject)"
                                    :disabled="loading">
                            <icon class="icon" name="mdi-delete" size="20"></icon>
                            Delete {{selectedObject.item.total}} points
                        </mdl-button>
                    </div>
                </div>
            </div>

            <div class="sidebar-shadow mdl-shadow--8dp"></div>
        </div>
        <div class="container">
            <map class="map" v-ref:map
                 :center.sync="center"
                 :zoom.sync="zoom"
                 :radius.sync="radius"
                 :map-type-id.sync="mapTypeId"
                 @g-bounds_changed="boundsChanged"
                 @g-dragstart="mapDragStart"
                 @g-dragend="mapDragEnd"
                 @g-click="mapClick">

                <marker
                        v-for="feature in features.items" track-by="id"
                        :position="feature.coordinates | latLng"
                        @g-click="markerSelect(feature)"
                >
                </marker>

                <marker
                        v-for="feature in features.geo.groups" track-by="groupId"
                        :position="feature.coordinates | latLng"
                        :icon="getMarkerIcon(feature)"
                        @g-click="groupSelect(feature)"
                >
                </marker>

                <marker v-if="selectedPoint"
                        :position="selectedPoint.coordinates | latLng"
                >
                </marker>

                <rectangle v-if="boundaryBox"
                           :bounds="boundaryBox | pointsToBounds"
                >
                </rectangle>

                <marker v-if="newPoint"
                        :position.sync="newPoint"
                        :draggable="true"
                >
                </marker>

                <circle v-ref:circle v-if="nearby.enabled && nearby.showArea"
                        :center="nearby.center | latLng"
                        :radius="nearby.radius"
                >
                </circle>
            </map>
        </div>
    </div>
</template>

<!--
<div class="mdl-card">
                <mdl-checkbox :checked.sync="georadiusCircle.visible">Limit by radius</mdl-checkbox>
            </div>
<rectangle v-for="group in features.geo.groups" track-by="groupId"
        :bounds="group.boundaryBox | pointsToBounds"
>
</rectangle>
<marker v-for="group in features.geo.groups" track-by="groupId"
        :position="group.center | latLng"
        :icon="getMarkerIcon(group)"
>
</marker>
<circle v-ref:circle v-if="georadiusCircle.visible"
                        :center="georadiusCircle.coordinates | latLng"
                        :radius="georadiusCircle.radius"
                        :editable="true"
                        @g-radius_changed="georadiusCircleUpdate"
                >
                </circle>

<li>
                            <span class="item-title">Group ID:</span>
                            <span v-text="selectedObject.item.groupId"></span>
                        </li>
                        <li>
                            <span class="item-title">Coordinates:</span>
                            <div v-text="selectedObject.item.coordinates[1]"></div>
                            <div v-text="selectedObject.item.coordinates[0]"></div>
                        </li>
                        <li>
                            <span class="item-title">Boundary box:</span>
                            <div v-text="selectedObject.item.boundaryBox[0][1]"></div>
                            <div v-text="selectedObject.item.boundaryBox[0][0]"></div>
                            <div v-text="selectedObject.item.boundaryBox[1][1]"></div>
                            <div v-text="selectedObject.item.boundaryBox[1][0]"></div>
                            <mdl-button v-mdl-ripple-effect @click="boundaryBox=selectedObject.item.boundaryBox">
                                Show
                            </mdl-button>
                        </li>
-->

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
        position : absolute;
        z-index  : 2;
        top      : 0;
        bottom   : 0;
        width    : 100%;
    }

    .container {
        flex     : 1;
        position : relative;
    }

    .mdl-card {
        display        : flex;
        flex-direction : column;
        width          : 300px;
        min-height     : 0;
        padding        : 8px;
        max-height     : 100%;
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

<script lang="babel">
    import _ from "lodash";
    import $ from "jquery";
    import {load as loadGoogleMap, Map, Marker, Rectangle, Circle} from '../components/vue-google-maps/main';
    import {
            getGeoFeatures,
            getPointsByGroup,
            deleteGroup,
            deleteFeature,
            addFeature
    } from "../scripts/vuex/modules/geo";
    import clusteringMarkerTemplate from "./pg-home/clustering-marker.html";
    import VcuFindNearby from "../components/vcu-find-nearby.vue"

    /*
     * https://github.com/GuillaumeLeclerc/vue-google-maps
     * https://developers.google.com/maps/documentation/javascript/tutorial
     */
    export default {
        vuex: {
            getters: {
                features: ( {geo} ) => geo.features,
                pointsByGroup: ( {geo} ) => geo.pointsByGroup,
                loading: ( {api} ) => api.loading
            },
            actions: {
                getGeoFeatures,
                getPointsByGroup,
                actionDeleteGroup: deleteGroup,
                actionDeleteFeature: deleteFeature,
                actionAddFeature: addFeature
            }
        },
        data () {
            return {
                radius: 0,
                googleMapLoaded: false,
                // center: {lat: 69.352158, lng: 88.185174},
                // center: {lat: 40.8583013724024, lng: -100.65470026757816},
                center: {lat: 32.310286886043485, lng: -64.75532816674809},
                zoom: 12,
                clickable: true,
                draggable: true,
                mapTypeId: 'terrain',
                query: {
                    filter: {
                        center: {
                            lng: 88.185174,
                            lat: 69.352158
                        },
                        radius: 1000,
                        units: 'm'
                    }
                },
                markerTemplate: '',
                markerStyle: [
                    {
                        outerColor: '#2196F3',
                        innerColor: '#2196F3',
                        outerOpacity: 0.4,
                        innerOpacity: 0.9
                    },
                    {
                        outerColor: '#FFC107',
                        innerColor: '#FFC107',
                        outerOpacity: 0.4,
                        innerOpacity: 0.9
                    },
                    {
                        outerColor: '#FF5722',
                        innerColor: '#FF5722',
                        outerOpacity: 0.4,
                        innerOpacity: 0.9
                    }
                ],
                marker: [],
                selectedObject: {
                    type: ''
                },
                boundaryBox: null,
                selectedPoint: null,
                newPoint: null,
                nearby: {
                    enabled: false,
                    radius: 5000,
                    units: 'm',
                    center: [0, 0],
                    showArea: true,
                    lockPosition: true
                }
            }
        },
        methods: {
            loadQueryFilter(){
                const query = localStorage.getItem( 'features-query-filter' );
                if( query ) this.query = JSON.parse( query );
            },
            saveQueryFilter(){
                localStorage.setItem( 'features-query-filter', JSON.stringify( this.query ) );
            },
            boundsChanged: _.debounce( function() {
                this.reloadFeatures();
                if( !this.nearby.lockPosition )
                {
                    this.nearby.center = [this.center.lng, this.center.lat];
                }
            }, 100 ),
            reloadFeatures: _.debounce( function() {
                this.updateRadius();
                if( this.nearby.enabled )
                {
                    this.query.filter.center = _.assign( {
                        lat: this.nearby.center[1],
                        lng: this.nearby.center[0]
                    } );
                    this.query.filter.radius = this.nearby.radius;
                    this.getGeoFeatures( this.query );
                }
                else
                {
                    this.query.filter.center = _.assign( {}, this.center );
                    this.query.filter.radius = this.radius;
                    this.getGeoFeatures( this.query );
                }
            }, 200 ),
            /**
             * Calculate radius (in meters)
             */
            updateRadius() {
                const map = this.$refs.map.mapObject;
                if( !map ) return 0;
                const bounds = map.getBounds(),
                        center = map.getCenter(),
                        ne = bounds.getNorthEast(),
                        radius = parseInt( google.maps.geometry.spherical.computeDistanceBetween( center, ne ), 10 ),
                        precision = Math.round( radius * 0.01 );
                this.radius = Math.round( radius / precision ) * precision;
            },
            /**
             * https://developers.google.com/maps/documentation/javascript/markers
             */
            getMarkerIcon( feature ){
                if( feature.groupId )
                {
                    if( feature.total < 11 ) return {
                        url: [this.marker[0][0], feature.total, this.marker[0][1]].join( '' ),
                        scaledSize: {
                            height: 40,
                            width: 40
                        }
                    };
                    if( feature.total < 31 ) return {
                        url: [this.marker[1][0], feature.total, this.marker[1][1]].join( '' ),
                        scaledSize: {
                            height: 48,
                            width: 48
                        }
                    };
                    if( feature.total > 30 ) return {
                        url: [this.marker[2][0], feature.total, this.marker[2][1]].join( '' ),
                        scaledSize: {
                            height: 52,
                            width: 52
                        }
                    };
                }
            },
            generateMarkers(){
                const svgHtml = clusteringMarkerTemplate;
                this.marker[0] = encodeURI( _.template( svgHtml )( this.markerStyle[0] ) ).split( 'LABEL' );
                this.marker[0][0] = 'data:image/svg+xml;charset=utf-8,' + this.marker[0][0];
                this.marker[1] = encodeURI( _.template( svgHtml )( this.markerStyle[1] ) ).split( 'LABEL' );
                this.marker[1][0] = 'data:image/svg+xml;charset=utf-8,' + this.marker[1][0];
                this.marker[2] = encodeURI( _.template( svgHtml )( this.markerStyle[2] ) ).split( 'LABEL' );
                this.marker[2][0] = 'data:image/svg+xml;charset=utf-8,' + this.marker[2][0];
            },
            markerSelect( point ){
                this.selectedObject = {
                    type: 'point',
                    item: point
                };
                this.boundaryBox = null;
            },
            groupSelect( group ){
                this.selectedObject = {
                    type: 'group',
                    item: group
                };
                this.getPointsByGroup( group.groupId );
                this.boundaryBox = null;
            },
            mapClick(){
                this.selectedObject = {};
                this.boundaryBox = null;
            },
            mapDragStart(){
            },
            mapDragEnd(){
            },
            deletePoints( object ){
                if( object.type === 'group' )
                {
                    this.actionDeleteGroup( object.item.groupId ).then( ()=> {
                        this.selectedObject = {};
                        this.boundaryBox = null;
                        this.reloadFeatures();
                    } );
                }
                if( object.type === 'point' )
                {
                    this.actionDeleteFeature( object.item.id ).then( ()=> {
                        this.selectedObject = {};
                        this.boundaryBox = null;
                        this.reloadFeatures();
                    } );
                }
            },
            showAddPointForm(){
                this.selectedObject = {
                    type: 'new-point'
                };
                this.newPoint = {
                    lat: this.center.lat,
                    lng: this.center.lng,
                    placeName: 'Test'
                }
            },
            addPoints( point ){
                this.actionAddFeature( {
                    type: 'Point',
                    coordinates: [point.lng, point.lat],
                    properties: {
                        placeName: point.placeName
                    },
                    dataset: 'custom'
                } ).then( ()=> {
                    this.selectedObject = {};
                    this.boundaryBox = null;
                    this.newPoint = null;
                    this.reloadFeatures();
                } );
            },
            findNearby(){
                this.nearby.center = _.clone( this.selectedObject.item.coordinates );
                this.nearby.enabled = true;
                this.reloadFeatures();
            }
        },
        route: {
            data ( {to, next} ) {
                this.loadQueryFilter();
//                if( this.query && _.isEmpty( to.query ) )
//                {
//                    this.$router.go( this.$options.filters.qs( this.query ) );
//                }
//                else
//                {
//                    Promise.all( [
//                        this.geoFeatures( _.assign( {}, to.query ) )
//                    ] ).then( next );
//                }
            }
        },
        created(){
            this.loadQueryFilter();
            this.generateMarkers();
        },
        ready(){
            if( !this.googleMapLoaded )
            {
                loadGoogleMap( {
                    key: 'AIzaSyA2ar1XotZTtwDP1UE8v0GAmrvimSiocx4',
                    v: '3.24',
                    libraries: 'geometry'
                } );
                this.googleMapLoaded = true;
            }

            this.nearby.center = [this.center.lng, this.center.lat]
        },
        filters: {
            latLng: {
                read: ( val ) => ({lat: val[1], lng: val[0]}),
                write: ( val ) => [val.lng, val.lat]
            },
            pointsToBounds: ( points ) => {
                return {
                    north: _.min( [points[0][1], points[1][1]] ),
                    south: _.max( [points[0][1], points[1][1]] ),
                    west: _.min( [points[0][0], points[1][0]] ),
                    east: _.max( [points[0][0], points[1][0]] )
                }
            }
        },
        components: {
            Map,
            Marker,
            Rectangle,
            Circle,
            VcuFindNearby
        }
    }
</script>