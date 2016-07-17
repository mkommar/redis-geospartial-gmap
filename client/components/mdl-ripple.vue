<template>
    <span class="mdl-button__ripple-container mdl-js-ripple-effect">
            <span class="mdl-ripple"></span>
    </span>
</template>

<script lang="babel">
    export default{
        ready () {
            componentHandler.upgradeElements( this.$el )
        }
    }
</script>
