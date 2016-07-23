<template>
    <div class="mdl-grid">
        <div class="mdl-cell mdl-cell--12-col">
            <div class="nearby__area-checkbox">
                <mdl-checkbox :checked.sync="nearby.enabled" @change="update">Nearby points</mdl-checkbox>
            </div>
        </div>

        <div class="mdl-cell mdl-cell--8-col" v-show="nearby.enabled" @change="update">
            <mdl-textfield floating-label="Radius" :value.sync="nearby.radius | toNumber" @keyUp="update">
            </mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--4-col" v-show="nearby.enabled">
            <mdl-select id="nearby-units" label="Units" value="m" :options="['m','km','mi','ft']" @change="update">
            </mdl-select>
        </div>
        <div class="mdl-cell mdl-cell--6-col" v-show="nearby.enabled">
            <mdl-textfield floating-label="Latitude" :value.sync="nearby.center[1] | toNumber" @keyUp="update">
            </mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--6-col" v-show="nearby.enabled">
            <mdl-textfield floating-label="Longitude" :value.sync="nearby.center[0] | toNumber" @keyUp="update">
            </mdl-textfield>
        </div>
        <div class="mdl-cell mdl-cell--12-col" v-show="nearby.enabled">
            <div class="nearby__area-checkbox">
                <mdl-checkbox :checked.sync="nearby.lockPosition">Lock position</mdl-checkbox>
            </div>
        </div>
        <div class="mdl-cell mdl-cell--12-col" v-show="nearby.enabled">
            <div class="nearby__area-checkbox">
                <mdl-checkbox :checked.sync="nearby.showArea">Show area</mdl-checkbox>
            </div>
        </div>
    </div>
</template>

<style lang="scss">

</style>

<script lang="babel">
    export default{
        props: ['nearby'],
        methods: {
            update(){
                this.$emit( 'c-nearby_update' );
            }
        },
        filters: {
            toNumber: {
                read: ( val ) => val,
                write: ( val ) => Number( val )
            }
        }
    }
</script>
