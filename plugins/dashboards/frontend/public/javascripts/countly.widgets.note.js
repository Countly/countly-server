/*global countlyVue, CV, countlyCommon, ElementTiptap */

(function() {
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
                return unescapedHTML;
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
                    return countlyCommon.unescapeHtml(this.scope.editedObject.contenthtml);
                },
                set(val) {
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