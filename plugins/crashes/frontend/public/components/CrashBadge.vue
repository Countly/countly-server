<template>
    <span class="bu-tag text-uppercase crash-badge" :class="'crash-badge--' + $props.type"><slot></slot></span>
</template>

<script>
export default {
    props: {
        type: {type: String, default: "info"},
    }
};
</script>
