<template>
<div class="dbviewer-tab__filter-textarea">
    <label class="text-small">{{ i18n('dbviewer.filter-query') }}</label>
    <el-input
        type="textarea"
        :value="value"
        placeholder="{}"
        @input="$emit('input', $event)">
    </el-input>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
export default {
    mixins: [i18nMixin],
    props: {
        value: { type: [String, Object], default: '' }
    }
};
</script>
