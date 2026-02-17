<template>
<div class="bu-is-flex bu-is-flex-wrap-wrap wrapper">
    <article-component
        v-for="(item, index) in items"
        :value="items[index]"
        :index="index"
        :class="{'bu-is-one-third': true, 'border-box': true}"
        :key="items[index].id"
    >
    </article-component>
</div>
</template>

<script>
import ArticleComponent from './ArticleComponent.vue';

export default {
    components: {
        'article-component': ArticleComponent
    },
    props: {
        items: { type: Array, required: false }
    }
};
</script>
