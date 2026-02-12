<template>
<div class="populator-template__main-container bu-py-3 bu-px-4">
    <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center">
        <div class="text-small text-uppercase populator-template--text-custom-detail">{{title}}</div>
        <div>
            <el-button type="text" class="el-button text-smallish bu-pr-1 bu-has-text-weight-medium populator-template--btn-delete el-button--text" @click="$emit('remove')"> <span v-if="entity"> Delete {{ entity }} </span> </el-button>
        </div>
    </div>
    <slot/>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        title: {
            type: String,
            default: '',
            required: true
        },
        entity: {
            type: String,
            default: '',
            required: false
        }
    }
};
</script>
