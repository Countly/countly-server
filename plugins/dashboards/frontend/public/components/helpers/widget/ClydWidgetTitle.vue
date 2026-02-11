<template>
<div
    class="bu-is-flex bu-is-flex-shrink-1"
    style="min-width: 0"
    @mousedown.stop
>
    <h4
        v-if="title"
        class="bu-is-flex-shrink-1 has-ellipsis"
        data-test-id="widget-title"
    >
        {{ unescapeHtml(title) }}
    </h4>
    <clyd-title-labels
        v-if="labels && labels.length"
        :labels="labels"
    />
</div>
</template>

<script>
import { commonFormattersMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
export default {
    mixins: [commonFormattersMixin],
    props: {
        title: {
            type: String,
            default: ""
        },
        labels: {
            type: Array,
            default: function() {
                return [];
            }
        }
    }
};
</script>
