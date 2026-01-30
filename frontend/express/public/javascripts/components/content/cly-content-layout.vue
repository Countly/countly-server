<template>
    <div class="cly-vue-content-builder">
        <div
            class="cly-vue-content-builder__layout-header"
            :style="{ backgroundColor }"
        >
            <slot
                name="content-layout-header"
                :background-color="backgroundColor"
            />
        </div>
        <div
            :class="containerClass"
            :style="{ backgroundColor }"
        >
            <slot name="content-layout-body" />
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../../mixins/base.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        backgroundColor: {
            default: null,
            type: String
        },
        popperClass: {
            default: null,
            type: String
        }
    },
    computed: {
        containerClass() {
            return this.popperClass || 'cly-vue-content-builder__layout-main';
        }
    }
};
</script>
