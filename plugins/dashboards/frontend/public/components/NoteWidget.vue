<template>
<div v-bind:class="[componentId, 'clyd-widget', 'dashboards-notes-widget']">
    <div class="bu-level notes-widget-button">
        <div class="bu-level-left" />
        <div class="bu-level-right">
            <slot name="action" />
        </div>
    </div>
    <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center clyd-widget__content__note">
        <vue-scroll :ops="scrollNote">
            <span
                class="el-tiptap-editor el-tiptap-editor__content ProseMirror"
                v-html="widgetHTML"
                @mousedown.stop
            />
        </vue-scroll>
    </div>
</div>
</template>

<script>
import { mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

export default {
    mixins: [mixins.customDashboards.global],
    data: function() {
        return {
            scrollNote: {
                bar: {
                    background: "#a6aeb8",
                    keepShow: true,
                    size: "4px"
                },
            },
        };
    },
    computed: {
        widgetHTML: function() {
            var unescapedHTML = countlyCommon.unescapeHtml(this.data.contenthtml);
            unescapedHTML = unescapedHTML.replace(/<p[^>]*><\/p>/g, '<br>');
            return unescapedHTML;
        }
    },
};
</script>
