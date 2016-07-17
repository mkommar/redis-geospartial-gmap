<template>
    <a class="mdl-tabs__tab" :class="{'is-active':active===tab}" @click="active = tab">
        <slot></slot>
        <span class="mdl-tabs__ripple-container mdl-js-ripple-effect">
            <span class="mdl-ripple"></span>
        </span>
    </a>
</template>

<script>
    export default {
        props: ['active', 'tab']
    }
</script>