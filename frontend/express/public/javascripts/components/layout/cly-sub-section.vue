<template>
    <div class="cly-vue-section__sub bu-px-4 bu-py-2">
        <slot></slot>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';

export default {
    mixins: [BaseComponentMixin]
};
</script>
