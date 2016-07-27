<template>
    <circle v-if="visible"
            :center="center"
            :radius="radius | unitsConverter units"
            @g-click="onClick"
    >
    </circle>
</template>

<script lang="babel">
    import {Circle} from '../components/vue-google-maps/main';

    export default{
        vuex: {
            getters: {
                visible: ( {nearby} ) => nearby.showArea,
                center: ( {nearby} ) => nearby.center,
                radius: ( {nearby} ) => nearby.radius,
                units: ( {nearby} ) => nearby.units
            }
        },
        methods: {
            onClick(){
                this.$dispatch( 'click', this.$options.name );
            }
        },
        filters: {
            unitsConverter: {
                read( radius, units ){
                    if( units === 'm' ) return radius;
                    if( units === 'km' ) return radius * 1000;
                    if( units === 'mi' ) return radius * 1609.34;
                    if( units === 'ft' ) return radius * 0.3048;
                },
                write(){}
            }
        },
        components: {
            Circle
        }
    }
</script>
