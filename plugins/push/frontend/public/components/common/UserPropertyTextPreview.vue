<template>
    <span>{{value}}</span>
</template>

<script>
export default {
    props: {
        value: {
            type: String,
            required: true
        }
    }
};
</script>
