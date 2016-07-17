<template>
    <label class="chip" :class='{ "is-disabled": disabled, "is-checked": isChecked }'>
        <input type="checkbox" class="checkbox" :value="value" v-model="checked">
        <span class="image" :style="{ 'background-image': 'url('+image+')' }"></span>
        <span v-text="text"></span>
        <mdl-ripple></mdl-ripple>
    </label>
</template>

<style lang="scss" scoped>
    @import "../styles/_exports";

    $chip-size : 32px;

    .checkbox {
        position   : absolute;
        width      : 0;
        height     : 0;
        margin     : 0;
        padding    : 0;
        opacity    : 0;
        appearance : none;
        border     : none;
    }

    .chip {
        display          : inline-block;
        position         : relative;

        background-color : #e4e4e4;
        border-radius    : $chip-size/2;
        overflow         : hidden;

        margin-right     : 6px;

        line-height      : $chip-size;
        height           : $chip-size;
        font-size        : 14px;
        font-weight      : 500;
        color            : rgba(0, 0, 0, 0.6);
        padding          : 0 10px;
        cursor           : pointer;
        &:hover {
            background-color : #dedede;
        }
        &.is-checked {
            background-color : dodgerblue;
        }
    }

    .image {
        display       : inline-block;
        float         : left;
        margin        : 0 8px 0 -10px;
        height        : $chip-size;
        width         : $chip-size;
        border-radius : 0 50% 50% 0;
    }

    .mdl-button__ripple-container {
        border-radius : $chip-size/2;
    }
</style>

<script lang="babel">
    import _ from 'lodash';
    import MdlRipple from './mdl-ripple.vue';

    export default{
        props: ['image', 'text', 'removeable', 'checked', 'value'],
        methods: {
            remove(){
                this.checked.splice( this.checked.indexOf( this.value ), 1 );
            },
            select(){

            }
        },
        data(){
            return {
                isOnly: false
            };
        },
        computed: {
            isChecked () {
                return _.isArray( this.checked ) ? this.checked.indexOf( this.value ) >= 0 : false;
            }
        },
        components: {
            MdlRipple
        }
    }
</script>