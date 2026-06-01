/*global countlyVue, CV, countlyCommon, ElementTiptap, filterXSS */

(function() {
    // Note content is rich text (TipTap editor) and is rendered with v-html
    // after unescapeHtml(), which undoes the API's output escaping. Sanitize
    // it with an allowlist covering only the formatting the editor produces,
    // so a note cannot inject scripts/handlers/unsafe tags that would execute
    // when another user views the dashboard.
    var NOTE_STYLE_TAGS = ["p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
        "strong", "b", "em", "i", "u", "s", "strike", "mark", "sub", "sup",
        "ul", "ol", "li", "blockquote", "pre", "code", "hr"];
    var noteWhiteList = {
        a: ["href", "target", "class", "style", "title"],
        br: [],
        input: ["type", "checked", "disabled"],
        label: ["class"]
    };
    NOTE_STYLE_TAGS.forEach(function(tag) {
        noteWhiteList[tag] = ["class", "style"];
    });
    // Allow the CSS properties the editor emits. js-xss ships a property
    // allowlist that already permits color, background-color (highlight),
    // font-family, font-size and text-align, but disallows line-height by
    // default, so merge it back in (kept safe by the CSS value filter).
    var noteCSSWhiteList = {};
    if (typeof filterXSS === "function" && typeof filterXSS.getDefaultCSSWhiteList === "function") {
        noteCSSWhiteList = filterXSS.getDefaultCSSWhiteList();
        noteCSSWhiteList["line-height"] = true;
    }
    var noteXSSOptions = {
        whiteList: noteWhiteList,
        css: { whiteList: noteCSSWhiteList },
        stripIgnoreTag: true,
        stripIgnoreTagBody: ["script", "style"],
        onIgnoreTagAttr: function(tag, name, value) {
            // preserve data-* attributes (used by the editor for e.g. todo
            // lists); they are not script execution vectors
            if (name.substr(0, 5) === "data-") {
                return name + '="' + filterXSS.escapeAttrValue(value) + '"';
            }
        },
        onTagAttr: function(tag, name, value) {
            // href/src are left to the library's safeAttrValue, which permits
            // http(s)/mailto/tel/relative/anchor links and blocks javascript:
            // and other dangerous schemes - so links in notes keep working.
            if (tag === "input" && name === "type" && value !== "checkbox") {
                // todo lists only need checkboxes
                return "type='checkbox'";
            }
        }
    };
    /**
     * Sanitize note HTML content for safe rendering with v-html
     * @param {string} html - raw (unescaped) note html
     * @returns {string} sanitized html
     */
    function sanitizeNoteHTML(html) {
        if (typeof filterXSS === "function") {
            return filterXSS(html, noteXSSOptions);
        }
        // if the sanitizer is unavailable, fail closed by escaping
        return countlyCommon.encodeHtml(html);
    }
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/note/widget.html'),
        mixins: [countlyVue.mixins.customDashboards.global],
        data: function() {
            return {
                scrollNote: {
                    bar: {
                        background: "#a6aeb8",
                        keepShow: true,
                        size: "4px"
                    }
                },
            };
        },
        computed: {
            widgetHTML: function() {
                var unescapedHTML = countlyCommon.unescapeHtml(this.data.contenthtml);
                unescapedHTML = unescapedHTML.replace(/<p[^>]*><\/p>/g, '<br>');
                return sanitizeNoteHTML(unescapedHTML);
            }
        },
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#note-drawer",
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
                    new ElementTiptap.Doc(),
                    new ElementTiptap.Text(),
                    new ElementTiptap.Paragraph(),
                    new ElementTiptap.Heading({ level: 5 }),
                    new ElementTiptap.Bold({ bubble: true }), // render command-button in bubble menu.
                    new ElementTiptap.Underline({ bubble: true, menubar: false }), // render command-button in bubble menu but not in menubar.
                    new ElementTiptap.Italic(),
                    new ElementTiptap.Strike(),
                    new ElementTiptap.TextAlign(),
                    new ElementTiptap.FontSize({fontSizes: ['8', '10', '12', '14', '16', '18', '20', '24', '30', '36', '48', '60', '72', '96']}),
                    new ElementTiptap.FontType(),
                    new ElementTiptap.LineHeight({lineHeights: ['100%', '150%', '200%', '250%', '300%']}),
                    new ElementTiptap.TextColor({colors: countlyCommon.GRAPH_COLORS}),
                    new ElementTiptap.TextHighlight(),
                    new ElementTiptap.HorizontalRule(),
                    new ElementTiptap.Link(),
                    new ElementTiptap.ListItem(),
                    new ElementTiptap.BulletList(),
                    new ElementTiptap.OrderedList(),
                    new ElementTiptap.TodoItem(),
                    new ElementTiptap.TodoList(),
                    new ElementTiptap.Blockquote(),
                    new ElementTiptap.CodeBlock(),
                    new ElementTiptap.FormatClear(),
                    new ElementTiptap.History(),
                ]
            };
        },
        computed: {
            contentHtml: {
                get() {
                    this.scope.editedObject.contenthtml = countlyCommon.unescapeHtml(this.scope.editedObject.contenthtml);
                    return this.scope.editedObject.contenthtml;
                },
                set(val) {
                    if (val !== this.scope.editedObject.contenthtml) {
                        const tempElement = document.createElement('div');
                        tempElement.innerHTML = val;
                        const anchorTags = tempElement.querySelectorAll('a');
                        anchorTags.forEach((aTag) => {
                            const href = aTag.getAttribute('href');
                            if (href && !/^https?:\/\//i.test(href)) {
                                aTag.setAttribute('href', '#');
                            }
                        });
                        this.scope.editedObject.contenthtml = tempElement.innerHTML;
                    }
                }
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "note",
        label: CV.i18nM("dashboards.widget-type.note"),
        priority: 5,
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "note";
        },
        templates: [
            {
                namespace: "note",
                mapping: {
                    "drawer": "/dashboards/templates/widgets/note/drawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    widget_type: "note",
                    feature: "core",
                    apps: "*",
                    contenthtml: "",
                };
            },
            beforeSaveFn: function() {
            }
        },
        grid: {
            component: WidgetComponent,
            dimensions: function() {
                return {
                    minWidth: 1,
                    minHeight: 1,
                    width: 1,
                    height: 3
                };
            }
        }
    });
})();