<template>
    <div class="cly-vue-form">
        <slot name="default" v-bind="passedScope"></slot>
    </div>
</template>

<script>
import { BaseComponentMixin, MultiStepFormMixin } from './mixins.js';

export default {
    mixins: [BaseComponentMixin, MultiStepFormMixin]
};
</script>
