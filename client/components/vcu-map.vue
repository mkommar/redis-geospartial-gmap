<template>
    <map class="map" v-ref:map
         :center="center"
         :zoom="zoom"
         :radius="radius"
         :map-type-id="layer"
         @g-bounds_changed="onBoundsChanged"
         @g-click="onClick">

        <vcu-points></vcu-points>
        <vcu-nearby-radius></vcu-nearby-radius>
        <vcu-new-point-marker></vcu-new-point-marker>
    </map>
</template>

<style lang="scss" scoped>

</style>

<script lang="babel">
    import _ from "lodash";
    import {load, loaded as deferredLoaded, Map, Marker} from '../components/vue-google-maps/main';
    import VcuPoints from '../components/vcu-points.vue';
    import VcuNearbyRadius from '../components/vcu-nearby-radius.vue';
    import VcuNewPointMarker from '../components/vcu-new-point-marker.vue';

    export default{
        vuex: {
            getters: {
                radius: ( {map} ) => map.radius,
                loaded: ( {map} ) => map.loaded,
                center: ( {map} ) => map.center,
                zoom: ( {map} ) => map.zoom,
                clickable: ( {map} ) => map.clickable,
                draggable: ( {map} ) => map.draggable,
                layer: ( {map} ) => map.layer,

                points: ( {points} ) => points.items
            },
            actions: {
                setLoaded: ( {dispatch} ) => dispatch( 'MAP_LOADED' ),
                updateMapCenter: ( {dispatch}, coordinates ) => dispatch( 'MAP_CENTER', coordinates )
            }
        },
        methods: {
            onBoundsChanged: function() {
                this.$nextTick( () => {
                    this.updateMapCenter( _.clone( this.$refs.map.center ) );
                } )
            },
            onClick(){
                this.$dispatch( 'click', this.$options.name );
            }
        },
        ready(){
            if( this.loaded ) return;
            load( {
                key: 'AIzaSyA2ar1XotZTtwDP1UE8v0GAmrvimSiocx4',
                v: '3.24',
                libraries: 'geometry'
            } );
            deferredLoaded.then( () => {
                this.setLoaded();
            } );
        },
        components: {
            Map,
            Marker,
            VcuPoints,
            VcuNearbyRadius,
            VcuNewPointMarker
        }
    }
</script>
