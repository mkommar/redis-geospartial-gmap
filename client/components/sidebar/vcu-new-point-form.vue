<template>
    <div class="mdl-grid mdl-grid--no-spacing" v-if="point">
        <h3>New point</h3>
        <div class="mdl-cell mdl-cell--12-col">
            <mdl-textfield floating-label="Place name" :value="properties.placeName"
                           @keyUp="updateNumber('properties.placeName',$event)"></mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--6-col coordinates">
            <mdl-textfield floating-label="Latitude" :value="coordinates.lat"
                           @keyUp="updateNumber('coordinates.lat',$event)"></mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--6-col coordinates">
            <mdl-textfield floating-label="Longitude" :value="coordinates.lng"
                           @keyUp="updateNumber('coordinates.lng',$event)"></mdl-textfield>
        </div>

        <div class="mdl-card__actions">
            <mdl-button v-mdl-ripple-effect @click="savePoint(point)"
                        :disabled="loading">
                <icon class="icon" name="material-add" size="20"></icon>
                Save point
            </mdl-button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .button {
        margin-bottom : 0;
    }
</style>

<script lang="babel">
    import _ from "lodash";
    import {savePoint as actionSavePoint, resetNewPoint} from "../../scripts/vuex/modules/points";
    import {setMode, modes, setReloadRequired} from "../../scripts/vuex/actions";

    export default{
        vuex: {
            getters: {
                coordinates: ( {points} ) => points.newOne.coordinates,
                properties: ( {points} ) => points.newOne.properties,
                point: ( {points} ) => points.newOne
            },
            actions: {
                setNewPointValue: ( {dispatch}, path, val ) => dispatch( 'UPDATE_NEW_POINT_VALUE', path, val ),
                actionSavePoint,
                resetNewPoint,
                setMode,
                setReloadRequired
            }
        },
        methods: {
            updateNumber( name, {target:{value}} ){
                this.setNewPointValue( name, Number( value ) );
            },
            updateString( name, {target:{value}} ){
                this.setNewPointValue( name, value );
            },
            savePoint(){
                this.actionSavePoint( this.point ).then( () => {
                    this.resetNewPoint();
                    this.setMode( modes.NORMAL );
                    this.setReloadRequired();
                } );
            }
        }
    }
</script>
