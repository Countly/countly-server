/* global Vue, jQuery, _, countlyCommon, CountlyHelpers */

(function(countlyVue, $) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    /*
        Legacy layout components start here
    */

    Vue.component("cly-panel", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                title: { type: String, required: false },
                dateSelector: { type: Boolean, required: false, default: true },
                hasLeftBottom: { type: Boolean, required: false, default: false },
                onlyHead: { type: Boolean, required: false, default: false }
            },
            template: '<div class="cly-vue-panel widget">\n' +
                            '<div class="widget-header">\n' +
                                '<div class="left">\n' +
                                    '<div style="margin-left: 3px;">\n' +
                                        '<slot name="left-top">\n' +
                                            '<div class="title" :class="{small: hasLeftBottom}">{{title}}</div>\n' +
                                        '</slot>\n' +
                                        '<div v-if="hasLeftBottom">\n' +
                                            '<slot name="left-bottom"></slot>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                                '<div class="right">\n' +
                                    '<slot name="right-top">\n' +
                                        '<cly-global-date-selector-w v-once v-if="dateSelector"></cly-global-date-selector-w>\n' +
                                    '</slot>\n' +
                                '</div>\n' +
                            '</div>\n' +
                            '<div class="widget-content help-zone-vb" :class="{\'no-border\': onlyHead}">\n' +
                                '<slot/>\n' +
                            '</div>\n' +
                        '</div>',
        }
    ));

    /*
        Legacy layout components end here
    */

    /*
        Legacy input components start here
    */

    Vue.component("cly-radio", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {required: true, default: -1, type: [ String, Number ]},
                items: {
                    required: true,
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                skin: { default: "main", type: String},
                disabled: {type: Boolean, default: false}
            },
            computed: {
                topClasses: function() {
                    var classes = [];
                    if (["main", "light"].indexOf(this.skin) > -1) {
                        classes.push("radio-" + this.skin + "-skin");
                    }
                    else {
                        classes.push("radio-main-skin");
                    }
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    return classes;
                }
            },
            methods: {
                setValue: function(e) {
                    if (!this.disabled) {
                        this.$emit('input', e);
                    }
                }
            },
            template: '<div class="cly-vue-radio" v-bind:class="topClasses">\n' +
                            '<div class="radio-wrapper">\n' +
                                '<div @click="setValue(item.value)" v-for="(item, i) in items" :key="i" :class="{\'selected\': value == item.value}" class="radio-button">\n' +
                                    '<div class="box"></div>\n' +
                                    '<div class="text">{{item.label}}</div>\n' +
                                    '<div class="description">{{item.description}}</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-generic-radio", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {required: true, default: -1, type: [ String, Number ]},
                items: {
                    required: true,
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                skin: { default: "main", type: String},
            },
            computed: {
                skinClass: function() {
                    if (["main", "light"].indexOf(this.skin) > -1) {
                        return "generic-radio-" + this.skin + "-skin";
                    }
                    return "generic-radio-main-skin";
                }
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                }
            },
            template: '<div class="cly-vue-generic-radio" v-bind:class="[skinClass]">\n' +
                            '<div class="generic-radio-wrapper">\n' +
                                '<div @click="setValue(item.value)" v-for="(item, i) in items" :key="i" :class="{\'selected\': value == item.value}">\n' +
                                    '<div class="button-area">\n' +
                                        '<div class="component"><component :is="item.cmp" /></div>\n' +
                                        '<div class="text">{{item.label}}</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-text-field", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                value: {required: true, type: [ String, Number ], default: ''},
                removable: {type: Boolean, default: false},
                removeText: {type: String, default: ''},
                disabled: {type: Boolean, default: false}
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                },
                removeMe: function() {
                    this.$emit('remove-me');
                }
            },
            computed: {
                defaultListeners: function() {
                    return CountlyHelpers.objectWithoutProperties(this.$listeners, ["input"]);
                },
                innerRemoveText: function() {
                    if (this.removeText) {
                        return this.removeText;
                    }
                    return this.i18n("common.remove");
                }
            },
            template: '<div class="cly-vue-text-field">\n' +
                            '<div class="remove-button"\n' +
                                'v-if="removable && !disabled"\n' +
                                '@click="removeMe">\n' +
                                '{{innerRemoveText}}\n' +
                            '</div>\n' +
                            '<input type="text" class="input"\n' +
                                'v-on="defaultListeners" v-bind="$attrs"\n' +
                                'v-bind:value="value"\n' +
                                'v-bind:disabled="disabled"\n' +
                                'v-on:input="setValue($event.target.value)">\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-check-list", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {
                    default: function() {
                        return [];
                    },
                    type: Array
                },
                items: {
                    default: function() {
                        return [];
                    },
                    type: Array
                },
                skin: { default: "switch", type: String}
            },
            computed: {
                uncompressed: function() {
                    return this.getUncompressed();
                }
            },
            methods: {
                getUncompressed: function() {
                    var self = this;
                    return this.items.map(function(item) {
                        return self.value.indexOf(item.value) > -1;
                    });
                },
                setValue: function(value, status) {
                    var self = this;
                    var newArray = null;
                    if (status && self.value.indexOf(value) === -1) {
                        newArray = self.value.slice();
                        newArray.push(value);
                    }
                    else if (!status && self.value.indexOf(value) > -1) {
                        newArray = self.value.slice().filter(function(item) {
                            return item !== value;
                        });
                    }
                    if (newArray) {
                        this.$emit('input', newArray);
                    }
                }
            },
            template: '<div class="cly-vue-check-list">\n' +
                            '<cly-check v-for="(item, i) in items" :key="i" v-bind:skin="skin" v-bind:label="item.label" v-bind:value="uncompressed[i]" v-on:input="setValue(item.value, $event)">\n' +
                            '</cly-check>\n' +
                        '</div>'
        }
    ));

    Vue.component("cly-button", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                label: {type: String, default: ''},
                skin: { default: "green", type: String},
                disabled: {type: Boolean, default: false}
            },
            computed: {
                activeClasses: function() {
                    var classes = [this.skinClass];
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    return classes;
                },
                skinClass: function() {
                    if (["green", "light", "orange"].indexOf(this.skin) > -1) {
                        return "button-" + this.skin + "-skin";
                    }
                    return "button-light-skin";
                }
            },
            template: '<div class="cly-vue-button" v-bind:class="activeClasses" v-on="$listeners">{{label}}</div>'
        }
    ));

    Vue.component("cly-text-area", countlyBaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {required: true, type: [ String, Number ], default: ''}
            },
            methods: {
                setValue: function(e) {
                    this.$emit('input', e);
                }
            },
            computed: {
                defaultListeners: function() {
                    return CountlyHelpers.objectWithoutProperties(this.$listeners, ["input"]);
                }
            },
            template: '<textarea class="cly-vue-text-area"\n' +
                            'v-bind="$attrs"\n' +
                            'v-on="defaultListeners"\n' +
                            ':value="value"\n' +
                            '@input="setValue($event.target.value)">\n' +
                        '</textarea>'
        }
    ));

    Vue.component("cly-select-n", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                value: {
                    type: [Object, String, Number, Boolean],
                    default: function() {
                        return { name: "", value: null };
                    }
                },
                items: {
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                placeholder: { type: String, default: '' },
                dynamicItems: { type: Boolean, default: false },
                disabled: { type: Boolean, default: false },
                aligned: { type: String, default: "left" },
                skin: { type: String, default: 'default' },
                listDelayWarning: {type: String, default: null}
            },
            mounted: function() {
                $(this.$refs.scrollable).slimScroll({
                    height: '100%',
                    start: 'top',
                    wheelStep: 10,
                    position: 'right',
                    disableFadeOut: true
                });
            },
            data: function() {
                return {
                    tempSearchQuery: "", // in-sync search query value
                    searchQuery: "", // debounced search query value
                    navigatedIndex: null,
                    opened: false,
                    waitingItems: false,
                    hasFocus: false,
                    scroller: null
                };
            },
            computed: {
                selectedItem: function() {
                    return this.value;
                },
                searchable: function() {
                    return this.items.length > 10 || this.dynamicItems;
                },
                containerClasses: function() {
                    var classes = [];
                    if (this.opened) {
                        classes.push("active");
                    }
                    if (this.dynamicItems) {
                        classes.push("dynamic-items");
                    }
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    if (["default", "slim"].indexOf(this.skin) > -1) {
                        classes.push("select-" + this.skin + "-skin");
                    }
                    else {
                        classes.push("select-default-skin");
                    }
                    if (["left", "center", "right"].indexOf(this.aligned) > -1) {
                        classes.push("select-aligned-" + this.aligned);
                    }
                    else {
                        classes.push("select-aligned-left");
                    }
                    return classes;
                },
                dropClasses: function() {
                    var classes = ["drop"];
                    if (this.skin !== "slim") {
                        classes.push("combo");
                    }

                    return classes;
                },
                visibleItems: function() {
                    var self = this;
                    if (!this.dynamicItems && this.tempSearchQuery && this.tempSearchQuery !== "") {
                        var visible = this.items.map(function() {
                            return false;
                        });
                        var loweredQuery = self.tempSearchQuery.toLowerCase();
                        this.items.forEach(function(item, idx) {
                            if (Object.prototype.hasOwnProperty.call(item, "value")) {
                                if (item.name.toLowerCase().indexOf(loweredQuery) > -1) {
                                    visible[idx] = true;
                                    if (self.groupIndex[idx] > -1) {
                                        visible[self.groupIndex[idx]] = true;
                                    }
                                }
                            }
                        });
                        return this.items.filter(function(item, idx) {
                            return visible[idx];
                        });
                    }
                    else if (this.dynamicItems && this.waitingItems) {
                        // blocked for search event to complete
                        return [];
                    }
                    else {
                        return this.items;
                    }
                },
                groupIndex: function() {
                    var index = [],
                        currentGroup = -1,
                        self = this;

                    this.items.forEach(function(item, idx) {
                        if (self.isItemGroup(item)) {
                            currentGroup = idx;
                            index.push(-1);
                        }
                        else {
                            index.push(currentGroup);
                        }
                    });
                    return index;
                },
                isKeyboardNavAvailable: function() {
                    return this.opened && this.hasFocus;
                }
            },
            methods: {
                setItem: function(item) {
                    if (!this.isItemGroup(item)) {
                        this.$emit("input", item);
                        this.opened = false;
                    }
                },
                close: function() {
                    this.opened = false;
                },
                fireDynamicSearch: function() {
                    if (this.dynamicItems) {
                        this.waitingItems = true;
                        this.$emit("search", this.searchQuery);
                    }
                },
                toggle: function() {
                    if (!this.disabled) {
                        this.opened = !this.opened;
                    }
                },
                findItemByValue: function(value) {
                    var found = this.items.filter(function(item) {
                        return item.value === value;
                    });
                    if (found.length > 0) {
                        return found[0];
                    }
                    return null;
                },
                selectNavigatedElement: function() {
                    if (this.navigatedIndex !== null && this.navigatedIndex < this.visibleItems.length) {
                        this.setItem(this.visibleItems[this.navigatedIndex]);
                    }
                },
                setNavigatedIndex: function(navigatedIndex) {
                    this.navigatedIndex = navigatedIndex;
                },
                scrollToNavigatedIndex: function() {
                    var self = this,
                        $scrollable = $(self.$refs.scrollable);

                    if (self.navigatedIndex !== null && $scrollable) {
                        var y = ($scrollable.scrollTop() + $(self.$refs["tmpItemRef_" + self.navigatedIndex]).position().top) + "px";
                        $scrollable.slimScroll({scrollTo: y});
                    }
                },
                isItemGroup: function(element) {
                    if (!Object.prototype.hasOwnProperty.call(element, "value")) {
                        return true;
                    }
                    if (element.group) {
                        return true;
                    }
                    return false;
                },
                getNextNonGroupIndex: function(startFrom, direction) {
                    for (var offset = 0; offset < this.visibleItems.length; offset++) {
                        var current = (direction * offset + startFrom);
                        if (current < 0) {
                            current = this.visibleItems.length + current;
                        }
                        current = current % this.visibleItems.length;
                        if (!this.isItemGroup(this.visibleItems[current])) {
                            return current;
                        }
                    }
                },
                upKeyEvent: function() {
                    if (!this.isKeyboardNavAvailable) {
                        return;
                    }

                    if (this.navigatedIndex === null) {
                        this.navigatedIndex = this.visibleItems.length - 1;
                    }
                    else {
                        this.navigatedIndex = this.getNextNonGroupIndex(this.navigatedIndex - 1, -1);
                    }

                    this.scrollToNavigatedIndex();
                },
                downKeyEvent: function() {
                    if (!this.isKeyboardNavAvailable) {
                        return;
                    }

                    if (this.navigatedIndex === null) {
                        this.navigatedIndex = 0;
                    }
                    else {
                        this.navigatedIndex = this.getNextNonGroupIndex(this.navigatedIndex + 1, 1);
                    }

                    this.scrollToNavigatedIndex();
                },
                escKeyEvent: function() {
                    if (this.navigatedIndex === null && this.opened) {
                        this.close();
                        return;
                    }
                    else if (this.navigatedIndex !== null) {
                        this.navigatedIndex = null;
                    }
                },
                enterKeyEvent: function() {
                    if (this.navigatedIndex === null) {
                        return;
                    }

                    this.selectNavigatedElement();
                }
            },
            watch: {
                value: {
                    immediate: true,
                    handler: function(passedValue) {
                        if (typeof passedValue !== 'object') {
                            var item = this.findItemByValue(passedValue);
                            if (item) {
                                this.setItem(item);
                            }
                            else {
                                this.setItem({name: passedValue, value: passedValue});
                            }
                        }
                    }
                },
                opened: function(newValue) {
                    if (!newValue) {
                        this.tempSearchQuery = "";
                        this.searchQuery = "";
                        this.navigatedIndex = null;
                    }
                },
                tempSearchQuery: _.debounce(function(newVal) {
                    this.searchQuery = newVal;
                }, 500),
                searchQuery: function() {
                    this.fireDynamicSearch();
                },
                items: {
                    immediate: true,
                    handler: function() {
                        this.waitingItems = false;
                    }
                },
                visibleItems: function() {
                    this.navigatedIndex = null; // reset navigation on visible items change
                }
            },
            template: '<div class="cly-vue-select"\n' +
                            'v-bind:class="containerClasses"\n' +
                            'v-click-outside="close"\n' +
                            '@keydown.up.prevent="upKeyEvent"\n' +
                            '@keydown.down.prevent="downKeyEvent"\n' +
                            '@keydown.esc="escKeyEvent"\n' +
                            '@keydown.enter="enterKeyEvent">\n' +
                            '<div class="select-inner" @click="toggle">\n' +
                                '<div class="text-container">\n' +
                                    '<div v-if="selectedItem" class="text">\n' +
                                        '<span>{{selectedItem.name}}</span>\n' +
                                    '</div>\n' +
                                    '<div v-if="!selectedItem" class="text">\n' +
                                        '<span class="text-light-gray">{{placeholder}}</span>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                                '<div :class="dropClasses"></div>\n' +
                            '</div>\n' +
                            '<div class="search" v-if="searchable" v-show="opened">\n' +
                                '<div class="inner">\n' +
                                '<input type="search"\n' +
                                    '@focus="hasFocus = true"\n' +
                                    'v-model="tempSearchQuery"/>\n' +
                                '<i class="fa fa-search"></i>\n' +
                                '</div>\n' +
                            '</div>\n' +
                            '<div class="items-list square" v-show="opened">\n' +
                                '<div ref="scrollable" class="scrollable">\n' +
                                    '<div class="warning" v-if="dynamicItems && listDelayWarning">{{ listDelayWarning }}</div>\n' +
                                    '<div v-for="(item, i) in visibleItems" :key="i"\n' +
                                        '@mouseover="setNavigatedIndex(i)"\n' +
                                        '@mouseleave="setNavigatedIndex(null)"\n' +
                                        '@click="setItem(item)"\n' +
                                        ':ref="\'tmpItemRef_\' + i"\n' +
                                        ':class="{item: !isItemGroup(item), group : isItemGroup(item), navigated: i === navigatedIndex}">\n' +
                                        '<div v-if="isItemGroup(item)">\n' +
                                            '<span v-text="item.name"></span>\n' +
                                        '</div>\n' +
                                        '<div v-else v-bind:data-value="item.value">\n' +
                                            '<span v-text="item.name"></span>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    /*
        Legacy input components end here
    */

    /*
        Legacy form components start here
    */

    Vue.component("cly-content", _mixins.BaseContent.extend({
        template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                            '<div v-show="isActive"><slot/></div>\n' +
                        '</div>'
    }));

    var BaseStep = _mixins.BaseContent.extend({
        data: function() {
            return {
                isValid: true,
                isStep: true
            };
        }
    });

    Vue.component("cly-step", BaseStep.extend({
        methods: {
            setValid: function(valid) {
                this.isValid = valid;
            }
        },
        template: '<div class="cly-vue-content" :id="elementId" v-if="isActive || alwaysMounted">\n' +
                        '<div v-show="isActive"><slot :setValid="setValid"/></div>\n' +
                    '</div>'
    }));

    /*
        Legacy form components end here
    */

    /*
        Legacy dropdown components start here
    */

    Vue.component("cly-menubox", countlyBaseComponent.extend({
        template: '<div class="cly-vue-menubox menubox-default-skin" v-click-outside="outsideClose">\n' +
                            '<div class="menu-toggler" :class="{active: isOpened}" @click="toggle">\n' +
                                '<div class="text-container">\n' +
                                    '<div class="text">{{label}}</div>\n' +
                                '</div>\n' +
                                '<div class="drop"></div>\n' +
                            '</div>\n' +
                            '<div class="menu-body" v-show="isOpened">\n' +
                                '<slot></slot>\n' +
                            '</div>\n' +
                        '</div>',
        props: {
            label: { type: String, default: '' },
            isOpened: { type: Boolean, default: false }
        },
        methods: {
            toggle: function() {
                this.setStatus(!this.isOpened);
            },
            close: function() {
                this.setStatus(false);
            },
            outsideClose: function() {
                this.close();
                this.$emit('discard');
            },
            setStatus: function(targetState) {
                this.$emit('status-changed', targetState);
            }
        }
    }));

    Vue.component("cly-button-menu", countlyBaseComponent.extend({
        template: '<div class="cly-vue-button-menu" :class="[skinClass]" v-click-outside="close">\n' +
                        '<div class="toggler" @click.stop="toggle"></div>\n' +
                        '<div class="menu-body" :class="{active: opened}">\n' +
                            '<a @click="fireEvent(item.event)" class="item" v-for="(item, i) in items" :key="i">\n' +
                                '<i :class="item.icon"></i>\n' +
                                '<span>{{item.label}}</span>\n' +
                            '</a>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            items: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            skin: { default: "default", type: String}
        },
        computed: {
            skinClass: function() {
                if (["default", "single"].indexOf(this.skin) > -1) {
                    return "button-menu-" + this.skin + "-skin";
                }
                return "button-menu-default-skin";
            },
        },
        data: function() {
            return {
                opened: false
            };
        },
        methods: {
            toggle: function() {
                this.opened = !this.opened;
            },
            close: function() {
                this.opened = false;
            },
            fireEvent: function(eventKey) {
                this.$emit(eventKey);
                this.close();
            }
        }
    }));

    /*
        Legacy dropdown components end here
    */

    /*
        Legacy visualization components start here
    */

    Vue.component("cly-time-graph-w", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                dataPoints: {
                    required: true,
                    type: Array,
                    default: function() {
                        return [];
                    }
                },
                bucket: { required: false, default: null, type: String },
                overrideBucket: { required: false, default: false, type: Boolean },
                frozen: {default: false, type: Boolean},
                configPaths: { required: true, type: Array },
                configSmall: { required: false, default: false, type: Boolean },
                configOptions: { required: false, default: null, type: Object }
            },
            data: function() {
                return {
                    options: JSON.parse(JSON.stringify(this.configOptions)),
                    paths: JSON.parse(JSON.stringify(this.configPaths)),
                    small: JSON.parse(JSON.stringify(this.configSmall))
                };
            },
            computed: {
                hasData: function() {
                    if (this.dataPoints.length === 0) {
                        return false;
                    }
                    if (this.dataPoints[0].length === 0) {
                        return false;
                    }
                    return true;
                }
            },
            watch: {
                dataPoints: function() {
                    this.refresh();
                },
                frozen: function(newValue) {
                    if (!newValue) {
                        this.refresh();
                    }
                }
            },
            mounted: function() {
                this.refresh();
            },
            beforeDestroy: function() {
                this.unbindResizer();
            },
            methods: {
                refresh: function() {

                    if (this.frozen || $(this.$refs.container).is(":hidden") || !this.hasData) {
                        // no need to refresh if hidden
                        return;
                    }

                    var self = this;

                    var points = this.dataPoints.map(function(path, pathIdx) {
                        var series = path.map(function(val, idx) {
                            return [idx + 1, val];
                        });
                        var pathCopy = _.extend({}, self.paths[pathIdx]);
                        pathCopy.data = series;
                        return pathCopy;
                    });

                    this.unbindResizer();

                    countlyCommon.drawTimeGraph(points,
                        $(this.$refs.container),
                        this.bucket, this.overrideBucket,
                        this.small, null,
                        this.options);

                    setTimeout(function() {
                        self.initializeResizer();
                    }, 0);
                },
                initializeResizer: function() {
                    var plot = $(this.$refs.container).data("plot");
                    plot.getPlaceholder().resize(this._onResize);
                },
                unbindResizer: function() {
                    var plot = $(this.$refs.container).data("plot");
                    if (plot) {
                        plot.getPlaceholder().unbind("resize", this._onResize);
                    }
                },
                _onResize: function() {
                    var self = this,
                        plot = $(this.$refs.container).data("plot"),
                        placeholder = plot.getPlaceholder();

                    if (placeholder.width() === 0 || placeholder.height() === 0) {
                        return;
                    }

                    // plot.resize();
                    // plot.setupGrid();
                    // plot.draw();

                    var graphWidth = plot.width();

                    $(self.$refs.container).find(".graph-key-event-label").each(function() {
                        var o = plot.pointOffset({x: $(this).data("points")[0], y: $(this).data("points")[1]});

                        if (o.left <= 15) {
                            o.left = 15;
                        }

                        if (o.left >= (graphWidth - 15)) {
                            o.left = (graphWidth - 15);
                        }

                        $(this).css({
                            left: o.left
                        });
                    });

                    $(self.$refs.container).find(".graph-note-label").each(function() {
                        var o = plot.pointOffset({x: $(this).data("points")[0], y: $(this).data("points")[1]});

                        $(this).css({
                            left: o.left
                        });
                    });
                }
            },
            template: '<div class="cly-vue-time-graph-w">\n' +
                                '<div ref="container" class="graph-container"></div>\n' +
                                '<div class="cly-vue-graph-no-data" v-if="!hasData">\n' +
                                    '<div class="inner">\n' +
                                        '<div class="icon"></div>\n' +
                                        '<div class="text">{{i18n("common.graph.no-data")}}</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>'
        }
    ));

    Vue.component("cly-graph-w", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                dataPoints: {
                    required: true,
                    type: Object,
                    default: function() {
                        return {};
                    }
                },
                graphType: { required: false, type: String, default: "bar" },
                frozen: {default: false, type: Boolean},
                configOptions: { required: false, default: null, type: Object }
            },
            data: function() {
                return {
                    options: JSON.parse(JSON.stringify(this.configOptions))
                };
            },
            computed: {
                hasData: function() {
                    return !!this.dataPoints;
                }
            },
            watch: {
                dataPoints: function() {
                    this.refresh();
                },
                graphType: function() {
                    this.refresh();
                },
                frozen: function(newValue) {
                    if (!newValue) {
                        this.refresh();
                    }
                }
            },
            mounted: function() {
                this.refresh();
            },
            methods: {
                refresh: function() {

                    if (this.frozen || $(this.$refs.container).is(":hidden") || !this.hasData) {
                        // no need to refresh if hidden
                        return;
                    }

                    countlyCommon.drawGraph(this.dataPoints,
                        $(this.$refs.container),
                        this.graphType,
                        this.options);
                }
            },
            template: '<div class="cly-vue-graph-w">\n' +
                                '<div ref="container" class="graph-container"></div>\n' +
                                '<div class="cly-vue-graph-no-data" v-if="!hasData">\n' +
                                    '<div class="inner">\n' +
                                        '<div class="icon"></div>\n' +
                                        '<div class="text">{{i18n("common.graph.no-data")}}</div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>'
        }
    ));

    /*
        Legacy visualization components end here
    */

}(window.countlyVue = window.countlyVue || {}, jQuery));
