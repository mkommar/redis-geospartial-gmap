<template>
    <div v-show="active===tab">
        <slot></slot>
    </div>
</template>

<script>
    export default {
        props: ['active', 'tab']
    }
</script>