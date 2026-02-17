<template>
<div class="walkthroughs bu-is-flex bu-is-flex-wrap-wrap wrapper">
    <walkthrough-component
        v-for="(item, index) in items"
        :value="items[index]"
        :class="{'walkthroughs__item': true, 'border-box': true}"
        :key="items[index].id"
        :index="index"
    >
    </walkthrough-component>
</div>
</template>

<script>
import WalkthroughComponent from './WalkthroughComponent.vue';

export default {
    components: {
        'walkthrough-component': WalkthroughComponent
    },
    props: {
        items: { type: Array, required: false }
    }
};
</script>
