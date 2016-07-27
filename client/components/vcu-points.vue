<template>
    <marker
            v-for="point in points" track-by="id"
            :position="point.coordinates"
            @g-click="selectPoint(point)">
    </marker>
    <marker v-if="selected"
            :position="selected.coordinates">
    </marker>
</template>

<script lang="babel">
    import {Marker} from '../components/vue-google-maps/main';
    //    import {selectPoint} from '../scripts/vuex/modules/points';

    export default{
        vuex: {
            getters: {
                points: ( {points} ) => points.items,
                selected: ( {points} ) => points.selected
            },
            actions: {
                selectPoint: ( {dispatch}, point ) => dispatch( 'SELECT_POINT', point )
            }
        },
        methods: {},
        components: {
            Marker
        }
    }
</script>
