<template>
    <div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">
        <div v-show="isActive"><slot/></div>
    </div>
</template>

<script>
import { BaseContentMixin } from '../../countly/vue/core.js';

export default {
    extends: BaseContentMixin
};
</script>
