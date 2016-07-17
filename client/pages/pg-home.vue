<template>
    <div class="container">
        <map class="map" :center.sync="center" :zoom.sync="zoom" :map-type-id.sync="mapTypeId">
            <marker
                    v-for="m in markers"
                    :position.sync="m.position"
                    :clickable.sync="clickable"
                    :draggable.sync="draggable"
                    @g-click="center=m.position"
            ></marker>
        </map>
    </div>
</template>

<style lang="scss" scoped>
    @import "../styles/_exports";

    .container {
        display        : flex;
        flex-direction : column;
        flex           : 1;
        position       : relative;
    }

    .map {
        position : absolute;
        left     : 0;
        right    : 0;
        top      : 0;
        bottom   : 0;
    }
</style>

<script lang="babel">
    import {load, Map, Marker} from 'vue-google-maps';

    /*
     * https://github.com/GuillaumeLeclerc/vue-google-maps
     * https://developers.google.com/maps/documentation/javascript/tutorial
     */

    export default{
        data () {
            return {
                center: {lat: 10.0, lng: 10.0},
                markers: [{
                    position: {lat: 10.0, lng: 10.0}
                }, {
                    position: {lat: 11.0, lng: 11.0}
                }],
                zoom: 7,
                clickable: true,
                draggable: true,
                mapTypeId: 'terrain'
            }
        },
        components: {
            Map,
            Marker
        },
        ready(){
            load( 'AIzaSyA2ar1XotZTtwDP1UE8v0GAmrvimSiocx4', '3' );
        }
    }
</script>