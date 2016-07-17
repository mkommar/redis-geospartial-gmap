<template>
    <div class="chip">
        <span class="image" :style="{ 'background-image': 'url('+image+')' }"></span>
        <span v-text="text"></span>
    </div>
</template>

<style lang="scss" scoped>
    @import "../styles/_exports";

    .chip {
        display          : inline-block;
        height           : 28px;
        font-size        : 12px;
        font-weight      : 500;
        color            : rgba(0, 0, 0, 0.6);
        line-height      : 28px;
        padding          : 0 10px;
        border-radius    : 14px;
        background-color : #e4e4e4;

        margin           : 2px 6px 2px 0;
    }

    .image {
        display       : inline-block;
        float         : left;
        margin        : 0 8px 0 -10px;
        height        : 28px;
        width         : 28px;
        border-radius : 50%;
    }
</style>

<script lang="babel">
    export default{
        props: ['image', 'text']
    }
</script>