<template>
    <marker v-ref:marker v-if="point"
            :position="point.coordinates"
            :draggable="true"
            @g-drag="drag"
            :icon="{url:'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'}">
    </marker>
</template>

<script lang="babel">
    import _ from "lodash";
    import {Marker} from '../components/vue-google-maps/main';

    export default{
        vuex: {
            getters: {
                point: ( {points} ) => points.newOne
            },
            actions: {
                updateNewPointValue: ( {dispatch}, path, val ) => dispatch( 'UPDATE_NEW_POINT_VALUE', path, val )
            }
        },
        methods: {
            drag: _.debounce( function() {
                this.updateNewPointValue( 'coordinates', _.pick( this.$refs.marker.position, ['lat', 'lng'] ) );
            }, 20 )
        },
        components: {
            Marker
        }
    }
</script>
