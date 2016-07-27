<template>
    <div class="mdl-grid mdl-grid--no-spacing" v-if="point">
        <h3>
            <span v-text="point.properties.placeName">Selected point</span>
        </h3>

        <div class="mdl-cell mdl-cell--12-col">
            <span>Point ID:</span>
            <span v-text="point.id"></span>
        </div>

        <div class="mdl-cell mdl-cell--12-col">Coordinates:</div>
        <div class="mdl-cell mdl-cell--6-col" v-text="point.coordinates.lat"></div>
        <div class="mdl-cell mdl-cell--6-col" v-text="point.coordinates.lng"></div>

        <div class="mdl-cell mdl-cell--7-col">
            <mdl-button class="button-delete" v-mdl-ripple-effect @click="findNearby"
                        :disabled="loading">
                <icon class="icon" name="material-search" size="20"></icon>
                Find nearby
            </mdl-button>
        </div>

        <div class="mdl-cell mdl-cell--5-col">
            <mdl-button class="button-delete" v-mdl-ripple-effect @click="deletePoint"
                        :disabled="loading">
                <icon class="icon" name="material-delete" size="20"></icon>
                Delete point
            </mdl-button>
        </div>
    </div>
</template>

<style lang="scss">
    .coordinates {
        display : block;
    }
</style>

<script lang="babel">
    import _ from "lodash";
    import {
            setCenter as nearbySetCenter,
            lockPosition as nearbyLockPosition,
            reset as nearbyReset
    } from "../../scripts/vuex/modules/nearby";
    import {deletePoint as actionDeletePoint} from "../../scripts/vuex/modules/points";
    import {setReloadRequired} from "../../scripts/vuex/actions";

    export default{
        vuex: {
            getters: {
                point: ( {points} ) => points.selected,
                center: ( {nearby} ) => nearby.center,
                radius: ( {nearby} ) => nearby.radius,
                units: ( {nearby} ) => nearby.units
            },
            actions: {
                nearbySetCenter,
                nearbyLockPosition,
                actionDeletePoint,
                resetSelected: ( {dispatch} ) => dispatch( 'POINTS_RESET_SELECTED' ),
                setReloadRequired
            }
        },
        methods: {
            findNearby(){
                this.nearbySetCenter( _.clone( this.point.coordinates ) );
                this.nearbyLockPosition();
            },
            deletePoint(){
                this.actionDeletePoint( this.point.id ).then( () => {
                    this.resetSelected();
                    this.setReloadRequired();
                } );
            }
        }
    }
</script>
