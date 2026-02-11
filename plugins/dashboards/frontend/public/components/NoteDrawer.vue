<template>
<div>
    <cly-form-field name="content" rules="required" :label="i18nM('dashboards.add-note')">
        <el-tiptap
            v-model="contentHtml"
            :extensions="extensions"
            :placeholder="i18nM('dashboards.note-placeholder')"
        />
    </cly-form-field>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

export default {
    mixins: [i18nMixin],
    props: {
        scope: {
            type: Object,
            default: function() {
                return {};
            }
        }
    },
    data: function() {
        return {
            extensions: [
                new window.ElementTiptap.Doc(),
                new window.ElementTiptap.Text(),
                new window.ElementTiptap.Paragraph(),
                new window.ElementTiptap.Heading({ level: 5 }),
                new window.ElementTiptap.Bold({ bubble: true }),
                new window.ElementTiptap.Underline({ bubble: true, menubar: false }),
                new window.ElementTiptap.Italic(),
                new window.ElementTiptap.Strike(),
                new window.ElementTiptap.TextAlign(),
                new window.ElementTiptap.FontSize({fontSizes: ['8', '10', '12', '14', '16', '18', '20', '24', '30', '36', '48', '60', '72', '96']}),
                new window.ElementTiptap.FontType(),
                new window.ElementTiptap.LineHeight({lineHeights: ['100%', '150%', '200%', '250%', '300%']}),
                new window.ElementTiptap.TextColor({colors: countlyCommon.GRAPH_COLORS}),
                new window.ElementTiptap.TextHighlight(),
                new window.ElementTiptap.HorizontalRule(),
                new window.ElementTiptap.Link(),
                new window.ElementTiptap.ListItem(),
                new window.ElementTiptap.BulletList(),
                new window.ElementTiptap.OrderedList(),
                new window.ElementTiptap.TodoItem(),
                new window.ElementTiptap.TodoList(),
                new window.ElementTiptap.Blockquote(),
                new window.ElementTiptap.CodeBlock(),
                new window.ElementTiptap.FormatClear(),
                new window.ElementTiptap.History(),
            ]
        };
    },
    computed: {
        contentHtml: {
            get: function() {
                this.scope.editedObject.contenthtml = countlyCommon.unescapeHtml(this.scope.editedObject.contenthtml);
                return this.scope.editedObject.contenthtml;
            },
            set: function(val) {
                if (val !== this.scope.editedObject.contenthtml) {
                    var tempElement = document.createElement('div');
                    tempElement.innerHTML = val;
                    var anchorTags = tempElement.querySelectorAll('a');
                    anchorTags.forEach(function(aTag) {
                        var href = aTag.getAttribute('href');
                        if (href && !/^https?:\/\//i.test(href)) {
                            aTag.setAttribute('href', '#');
                        }
                    });
                    this.scope.editedObject.contenthtml = tempElement.innerHTML;
                }
            }
        }
    }
};
</script>
