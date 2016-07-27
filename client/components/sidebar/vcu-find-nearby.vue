<template>
    <div class="mdl-grid mdl-grid--no-spacing">
        <h3>Nearby points</h3>
        <div class="mdl-cell mdl-cell--12-col">
            <div class="nearby__area-checkbox">
                <mdl-checkbox :checked="visible" @change="updateBoolean('visible',$event)">
                    Nearby points
                </mdl-checkbox>
            </div>
        </div>

        <div class="mdl-cell mdl-cell--8-col" v-if="visible">
            <mdl-textfield floating-label="Radius" :value="radius"
                           @keyUp="updateNumber('radius',$event)"></mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--4-col" v-if="visible">
            <mdl-select id="nearby-units" label="Units" value="m" :options="['m','km','mi','ft']"
                        @change="updateString('units',$event)"></mdl-select>
        </div>
        <div class="mdl-cell mdl-cell--6-col" v-if="visible">
            <mdl-textfield class="coordinates" floating-label="Latitude" :value="center.lat"
                           @keyUp="updateNumber('center.lat',$event)"></mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--6-col" v-if="visible">
            <mdl-textfield class="coordinates" floating-label="Longitude" :value="center.lng"
                           @keyUp="updateNumber('center.lng',$event)"></mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--12-col" v-if="visible">
            <div class="nearby__area-checkbox">
                <mdl-checkbox :checked="lockPosition" @change="updateBoolean('lockPosition',$event)">
                    Lock position
                </mdl-checkbox>
            </div>
        </div>
        <div class="mdl-cell mdl-cell--12-col" v-if="visible">
            <div class="nearby__area-checkbox">
                <mdl-checkbox :checked="showArea" @change="updateBoolean('showArea',$event)">
                    Show area
                </mdl-checkbox>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .mdl-grid {
        width : 100%;
    }


</style>

<style lang="scss">
    .coordinates {
        .mdl-textfield__input {
            font-size : 14px;
        }
    }
</style>

<script lang="babel">
    import _ from "lodash";
    import {setNearbyValue, setCenter} from "../../scripts/vuex/modules/nearby";

    export default{
        vuex: {
            getters: {
                visible: ( {nearby} ) => nearby.visible,
                center: ( {nearby} ) => nearby.center,
                radius: ( {nearby} ) => nearby.radius,
                units: ( {nearby} ) => nearby.units,
                lockPosition: ( {nearby} ) => nearby.lockPosition,
                showArea: ( {nearby} ) => nearby.showArea,

                selectedPoint: ( {points} ) => points.selected,
                mapCenter: ( {map} ) => map.center
            },
            actions: {
                setNearbyValue,
                setCenter
            }
        },
        methods: {
            updateNumber( name, e ){
                this.$nextTick( ()=> {
                    const target = e.target.tagName.toLowerCase() === 'input' ? e.target : e.target.querySelector( 'input' );
                    this.setNearbyValue( name, Number( target.value ) );
                } );
            },
            updateString( name, e )
            {
                this.$nextTick( ()=> {
                    const target = e.target.tagName.toLowerCase() === 'input' ? e.target : e.target.querySelector( 'input' );
                    this.setNearbyValue( name, target.value );
                } );
            },
            updateBoolean( name, e )
            {
                this.$nextTick( ()=> {
                    const target = e.target.tagName.toLowerCase() === 'input' ? e.target : e.target.querySelector( 'input' );
                    this.setNearbyValue( name, Boolean( target.checked ) );
                } );
            },
            fetchNearby(){
                this.$router.go( this.$options.filters.qs( {
                    georadius: {
                        coordinates: this.center,
                        radius: this.radius,
                        units: this.units,
                        limit: {
                            count: 1000
                        }
                    }
                } ) );
            }
        },
        watch: {
            selectedPoint(){
                this.$nextTick( () => {
                    if( this.lockPosition ) return;
                    if( !this.selectedPoint ) return;
                    this.setCenter( _.clone( this.selectedPoint.coordinates ) );
                } );
            },
            mapCenter(){
                if( this.lockPosition ) return;
                this.setCenter( _.clone( this.mapCenter ) );
            },
            center(){
                this.fetchNearby();
            },
            radius(){
                this.fetchNearby();
            },
            units(){
                this.fetchNearby();
            }
        }
    }
</script>
