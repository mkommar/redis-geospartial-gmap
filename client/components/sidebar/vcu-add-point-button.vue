<template>
    <mdl-button colored fab @click="showAddPointForm">+</mdl-button>
</template>

<style lang="scss">

</style>

<script lang="babel">
    import _ from "lodash";
    import {setMode, modes} from "../../scripts/vuex/actions";

    export default{
        vuex: {
            getters: {
                mapCenter: ( {map} ) => map.center
            },
            actions: {
                setPointValue: ( {dispatch}, path, val ) => dispatch( 'UPDATE_NEW_POINT_VALUE', path, val ),
                setMode
            }
        },
        methods: {
            showAddPointForm(){
                this.setPointValue( 'coordinates', _.clone( this.mapCenter ) );
                this.setPointValue( 'properties.placeName', `point-${Date.now()}` );
                this.setMode( modes.NEW_POINT );
            }
        }
    }
</script>
