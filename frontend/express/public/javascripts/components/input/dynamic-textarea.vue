<template>
    <div contenteditable="true" @input="update" v-html="content"></div>
</template>

<script>
export default {
    props: {
        content: {
            type: String,
            default: ''
        }
    },
    methods: {
        update: function(event) {
            this.$emit('update', event.target.innerText);
        }
    }
};
</script>
