<template>
    <div class="cly-vue-empty-home">
        <div class="bu-mb-3" v-if="image">
            <img :src="image" class="image">
        </div>
        <div class="info">
            <div class="title">
                <h3>{{title}}</h3>
            </div>
            <div class="text">
                <span v-html="body"></span>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        title: { required: true, type: String },
        body: { required: true, type: String },
        image: { type: String, default: null }
    }
};
</script>
