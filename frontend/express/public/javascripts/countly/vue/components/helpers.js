/* global Vue, CV, app, countlyEvent, countlyGlobal, countlyAuth, VueJsonPretty, ElementTiptapPlugin*/

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    Vue.component("vue-json-pretty", VueJsonPretty.default);
    Vue.use(ElementTiptapPlugin);
    Vue.component("cly-back-link", countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.i18n
            ],
            props: {
                title: {type: String, required: false},
                link: {type: String, required: false}
            },
            methods: {
                back: function() {
                    if (this.link) {
                        app.navigate(this.link, true);
                    }
                    else {
                        app.back();
                    }
                }
            },
            computed: {
                innerTitle: function() {
                    if (this.title) {
                        return this.title;
                    }
                    return this.i18n("common.back");
                }
            },
            template: '<a @click="back" class="cly-vue-back-link"> \n' +
                            '<span class="text-medium bu-is-capitalized"><i class="fas fa-arrow-left bu-pr-3"></i>{{innerTitle}}</span>\n' +
                        '</a>'
        }
    ));

    Vue.component("cly-in-page-notification", countlyBaseComponent.extend(
        {
            props: {
                text: {type: String, required: false},
                color: {type: String, required: false, default: "light-warning"},
            },
            computed: {
                innerText: function() {
                    return this.text || "";
                },
                dynamicClasses: function() {
                    return ["cly-in-page-notification--" + this.color];
                },
            },
            template: '<div class="cly-in-page-notification text-medium bu-p-2" :class="dynamicClasses">\
                            <slot name="innerText">\
                                <span v-html="innerText"></span>\
                            </slot>\
                        </div>'
        }
    ));

    Vue.component("cly-empty-home", countlyBaseComponent.extend({
        template: '<div class="cly-vue-empty-home">\n' +
                    '<div class="bu-mb-3" v-if="image">\n' +
                        '<img :src="image" class="image">\n' +
                    '</div>\n' +
                    '<div class="info">\n' +
                        '<div class="title">\n' +
                            '<h3>{{title}}</h3>\n' +
                        '</div>\n' +
                        '<div class="text">\n' +
                            '<span v-html="body"></span>\n' +
                        '</div>\n' +
                    '</div>\n' +
                '</div>',
        mixins: [countlyVue.mixins.i18n],
        props: {
            title: { required: true, type: String },
            body: { required: true, type: String },
            image: { type: String, default: null }
        }
    }));

    Vue.component("cly-status-tag", countlyBaseComponent.extend({
        template: '<div class="cly-vue-status-tag" :class="dynamicClasses">\n' +
                     '<div class="cly-vue-status-tag__blink"></div>\n' +
                        '{{text}}\n' +
                  '</div>',
        mixins: [countlyVue.mixins.i18n],
        props: {
            text: { required: true, type: String },
            color: { default: "green", type: String},
            size: { default: "unset", type: String},
        },
        computed: {
            dynamicClasses: function() {
                if (this.size === "small") {
                    return ["cly-vue-status-tag--small", "cly-vue-status-tag--" + this.color];
                }
                return "cly-vue-status-tag--" + this.color;
            }
        },
    }));

    Vue.component("cly-diff-helper", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            diff: {
                type: Array
            },
            disabled: {
                type: Boolean,
                required: false,
                default: false
            },
            emitSaveWhenDisabled: {
                type: Boolean,
                required: false,
                default: false
            }
        },
        computed: {
            hasDiff: function() {
                return this.diff.length > 0;
            },
            madeChanges: function() {
                return this.i18n("common.diff-helper.changes", this.diff.length);
            }
        },
        methods: {
            save: function() {
                if (this.disabled && !this.emitSaveWhenDisabled) {
                    return;
                }
                this.$emit("save");
            },
            discard: function() {
                this.$emit("discard");
            }
        },
        template: '<div class="cly-vue-diff-helper" v-if="hasDiff">\n' +
                    '<slot name="main">\n' +
                      '<div class="message">\n' +
                          '<span class="text-dark">{{madeChanges}}</span>\n' +
                          '<span class="text-dark">{{ i18n("common.diff-helper.keep") }}</span>\n' +
                      '</div>\n' +
                      '<div class="buttons">\n' +
                          '<el-button skin="light" class="discard-btn" @click="discard" type="secondary">{{i18n(\'common.discard-changes\')}}</el-button>\n' +
                         '<el-button skin="green" class="save-btn" :disabled="disabled" @click="save" type="success">{{i18n(\'common.save-changes\')}}</el-button>\n' +
                      '</div>\n' +
                    '</slot>\n' +
                  '</div>'
    }));

    Vue.component("cly-metric-cards", countlyBaseComponent.extend({
        template: '<div :class="topClasses" class="cly-vue-metric-cards bu-columns bu-is-gapless bu-is-mobile"><slot></slot></div>',
        props: {
            multiline: {
                type: Boolean,
                default: true,
                required: false
            },
            isSyncedScroll: {
                type: Boolean,
                default: false,
                required: false
            }
        },
        computed: {
            topClasses: function() {
                if (this.multiline) {
                    return ["cly-vue-metric-cards--is-multiline", "bu-is-multiline"];
                }
                if (this.isSyncedScroll) {
                    return "is-synced";
                }
            }
        }
    }));

    Vue.component("cly-metric-card", countlyBaseComponent.extend({
        mixins: [
            _mixins.commonFormatters
        ],
        props: {
            label: {type: String, default: ''},
            number: {type: Number, default: 0},
            description: {type: String, default: ''},
            formatting: {type: String, default: 'auto'},
            isPercentage: {type: Boolean, default: false},
            columnWidth: {type: [Number, String], default: -1},
            isVertical: {type: Boolean, default: false},
            color: {type: [String, Function, Array], default: ''},
            numberClasses: {type: String, default: 'bu-is-flex bu-is-align-items-baseline'},
            boxType: {type: Number, default: -1},
            tooltip: {type: String, default: ''}
        },
        computed: {
            formattedNumber: function() {
                if (this.isNumberSlotUsed) {
                    // Avoid extra processing, it won't be shown anyway.
                    return '';
                }

                if (this.formatting === 'auto') {
                    if (this.isPercentage) {
                        return this.number + "%";
                    }
                    else if (Math.abs(this.number) >= 10000) {
                        return this.getShortNumber(this.number);
                    }
                    else {
                        return this.formatNumber(this.number);
                    }
                }
                else if (this.formatting === 'short') {
                    return this.getShortNumber(this.number);
                }
                else if (this.formatting === 'long') {
                    return this.formatNumber(this.number);
                }

                return this.number;
            },
            isDescriptionSlotUsed: function() {
                return !!this.$slots.description;
            },
            isNumberSlotUsed: function() {
                return !!this.$slots.number;
            },
            topClasses: function() {
                if (this.isVertical || this.columnWidth === -1) {
                    return "";
                }

                return "bu-is-" + this.columnWidth;
            },
            metricStyles: function() {
                var classes = "";
                if (this.boxType === 3) {
                    classes = "min-width: 33%";
                }
                else if (this.boxType === 4) {
                    classes = "min-width: 25%";
                }
                else if (this.boxType === 5) {
                    classes = "min-width: 20%";
                }
                return classes;
            }
        },
        template: '<div class="cly-vue-metric-card bu-column bu-is-flex" :class="topClasses" :style="metricStyles">\
                        <div class="cly-vue-metric-card__wrapper bu-p-5 bu-is-flex bu-is-justify-content-space-between has-ellipsis">\
                            <cly-progress-donut class="bu-pr-4 bu-is-flex" v-if="isPercentage" :color="color" :percentage="number"></cly-progress-donut>\
                            <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between has-ellipsis">\
                                <div class="bu-is-flex bu-is-align-items-center">\
                                    <span class="text-medium has-ellipsis" v-tooltip="label"><slot>{{label}}</slot></span>\
                                    <cly-tooltip-icon v-if="tooltip.length > 0" class="bu-is-flex-grow-1 bu-ml-1" :tooltip="tooltip"></cly-tooltip-icon>\
                                </div>\
                                <div :class=numberClasses>\
                                    <h2><slot name="number">{{formattedNumber}}</slot></h2>\
                                    <div class="bu-pl-2 bu-is-flex-grow-1"><slot name="description"><span class="text-medium">{{description}}</span></slot></div>\
                                </div>\
                            </div>\
                        </div>\
                    </div>'
    }));

    Vue.component("cly-metric-breakdown", countlyVue.components.create({
        template: countlyVue.T('/javascripts/countly/vue/templates/breakdown.html'),
        mixins: [
            _mixins.i18n
        ],
        props: {
            name: {
                type: String
            },
            description: {
                type: String,
                default: '',
                required: false
            },
            values: {
                type: Array
            },
            columnWidth: {type: [Number, String], default: -1},
            isVertical: {type: Boolean, default: false},
            color: {type: [String, Function, Array], default: '#017AFF'},
            scrollOps: {
                type: Object,
                default: null,
                required: false
            },
            isSyncedScroll: {
                type: Boolean,
                default: false,
                required: false
            }
        },
        computed: {
            topClasses: function() {
                if (this.isVertical || this.columnWidth === -1) {
                    return "";
                }
                else if (this.isSyncedScroll) {
                    return "is-synced bu-is-" + this.columnWidth;
                }
                else {
                    return "bu-is-" + this.columnWidth;
                }
            },
            effectiveScrollOps: function() {
                if (this.scrollOps) {
                    return this.scrollOps;
                }
                return this.defaultScrollOps;
            }
        },
        methods: {
            getProgressBarEntities: function(item) {
                return item.bar ? item.bar : [{color: this.color, percentage: item.percent}];
            }
        },
        data: function() {
            return {
                defaultScrollOps: {
                    vuescroll: {},
                    scrollPanel: {
                        initialScrollX: false,
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: false
                    }
                }
            };
        }
    }));

    Vue.component("cly-tooltip-icon", countlyBaseComponent.extend({
        props: {
            icon: {
                type: String,
                default: 'ion ion-help-circled'
            },
            tooltip: {
                type: String,
                default: ''
            },
            placement: {
                type: String,
                default: 'auto'
            }
        },
        computed: {
            tooltipConf: function() {
                return {
                    content: this.tooltip,
                    placement: this.placement
                };
            }
        },
        template: '<i v-if="tooltip" :class="\'cly-vue-tooltip-icon \' + icon" v-tooltip="tooltipConf"></i>'
    }));

    Vue.component("cly-remover", countlyBaseComponent.extend({
        props: {
            disabled: {
                type: Boolean,
                default: false
            }
        },
        methods: {
            remove: function() {
                if (!this.disabled) {
                    this.$emit("remove");
                }
            }
        },
        template: '<div class="cly-vue-remover"\n' +
                        'v-if="!disabled"\n' +
                        '@click="remove">\n' +
                        '<slot>\n' +
                            '<i class="el-icon-delete"></i>\n' +
                        '</slot>\n' +
                    '</div>\n'
    }));

    var popoverSizes = {
        "small": true,
        "medium": true,
        "auto": true,
        "small-chart": true,
        "medium-chart": true,
        "auto-chart": true
    };

    Vue.component("cly-popover", countlyBaseComponent.extend({
        props: {
            size: {
                type: String,
                default: 'medium',
                validator: function(val) {
                    return val in popoverSizes;
                }
            }
        },
        computed: {
            contentClasses: function() {
                return "cly-vue-popover__content cly-vue-popover__content--" + this.size;
            }
        },
        template: '<v-popover :popoverInnerClass="contentClasses" class="cly-vue-popover"\
                        v-bind="$attrs"\
                        v-on="$listeners">\
                        <slot></slot>\
                        <template v-slot:popover><slot name=\'content\'></slot></template>\
                    </v-popover>',
    }));

    Vue.component("cly-value", countlyBaseComponent.extend({
        template: '<span></span>',
        props: ['value']
    }));

    Vue.component("cly-app-select", {
        template: '<cly-select-x :options="options" :auto-commit="mode !== \'multi-check\'" :mode="mode" :max-items="multipleLimit" v-bind="$attrs" v-on="$listeners"></cly-select-x>',
        props: {
            allowAll: {
                type: Boolean,
                default: false,
                required: false
            },
            multiple: {
                type: Boolean,
                default: false,
                required: false
            },
            multipleLimit: {
                type: Number,
                default: 0,
                required: false
            },
            auth: {
                type: Object,
                default: function() {
                    return {};
                },
                required: false
            }
        },
        computed: {
            options: function() {
                if (this.allowAll) {
                    return [{label: 'All apps', value: 'all'}].concat(this.apps);
                }
                return this.apps;
            },
            mode: function() {
                return this.multiple ? "multi-check" : "single-list";
            },
            apps: function() {
                var apps = countlyGlobal.apps || {};

                if (this.auth && this.auth.feature && this.auth.permission) {
                    var expectedPermission = this.auth.permission,
                        targetFeature = this.auth.feature;

                    return Object.keys(apps).reduce(function(acc, key) {
                        var currentApp = apps[key];

                        if (countlyAuth.validate(expectedPermission, targetFeature, null, currentApp._id)) {
                            acc.push({
                                label: currentApp.name,
                                value: currentApp._id
                            });
                        }
                        return acc;
                    }, []);
                }

                return Object.keys(apps).map(function(key) {
                    return {
                        label: apps[key].name,
                        value: apps[key]._id
                    };
                });
            }
        }
    });

    Vue.component("cly-event-select", countlyBaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        template: '<cly-select-x\
                    pop-class="cly-event-select"\
                    all-placeholder="All Events"\
                    search-placeholder="Search in Events"\
                    placeholder="Select Event"\
                    :disabled="disabled"\
                    :hide-default-tabs="true"\
                    :options="availableEvents"\
                    :hide-all-options-tab="true"\
                    :single-option-settings="singleOptionSettings"\
                    :adaptive-length="adaptiveLength"\
                    :arrow="arrow"\
                    :width="width"\
                    v-bind="$attrs"\
                    v-on="$listeners">\
                    <template v-slot:header="selectScope">\
                        <h4 class="color-cool-gray-100 bu-mb-2" v-if="hasTitle">{{title}}</h4>\
                        <el-radio-group\
                            :value="selectScope.activeTabId"\
                            @input="selectScope.updateTab"\
                            size="small">\
                            <el-radio-button v-for="tab in selectScope.tabs" :key="tab.name" :label="tab.name">{{tab.label}}</el-radio-button>\
                        </el-radio-group>\
                    </template>\
                </cly-select-x>',
        props: {
            blacklistedEvents: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            width: { type: [Number, Object], default: 400},
            adaptiveLength: {type: Boolean, default: true},
            arrow: {type: Boolean, default: false},
            title: { type: String, require: false},
            selectedApp: {type: String, required: false, default: ''},
            disabled: {type: Boolean, default: false},
        },
        data: function() {
            return {
                singleOptionSettings: {
                    autoPick: true,
                    hideList: true
                }
            };
        },
        computed: {
            hasTitle: function() {
                return !!this.title;
            },
            availableEvents: function() {
                var self = this;
                var availableEvents = [
                    {
                        "label": this.i18n('sidebar.analytics.sessions'),
                        "name": "[CLY]_session",
                        "options": [ { label: this.i18n('sidebar.analytics.sessions'), value: '[CLY]_session' } ]
                    },
                    {
                        "label": this.i18n('sidebar.events'),
                        "name": "event",
                        "options": []
                    },
                    {
                        "label": this.i18n('internal-events.[CLY]_view'),
                        "name": "[CLY]_view",
                        "options": [ { label: this.i18n('internal-events.[CLY]_view'), value: '[CLY]_view' } ]
                    },
                    {
                        "label": this.i18n("sidebar.feedback"),
                        "name": "feedback",
                        "options": [
                            { label: this.i18n('internal-events.[CLY]_star_rating'), value: '[CLY]_star_rating' },
                            { label: this.i18n('internal-events.[CLY]_nps'), value: '[CLY]_nps' },
                            { label: this.i18n('internal-events.[CLY]_survey'), value: '[CLY]_survey' }
                        ]
                    },
                    {
                        "label": this.i18n('internal-events.[CLY]_crash'),
                        "name": "[CLY]_crash",
                        "options": [ { label: this.i18n('internal-events.[CLY]_crash'), value: '[CLY]_crash' } ]
                    }
                    // {
                    //     "label": this.i18n('internal-events.[CLY]_push_action'),
                    //     "name": "[CLY]_push_action",
                    //     "noChild": true
                    // }
                ];

                if (this.selectedApp) {
                    countlyEvent.getEventsForApps([this.selectedApp], function(eData) {
                        availableEvents[1].options = eData.map(function(e) {
                            return {label: e.name, value: e.value};
                        });
                    });
                }
                else {
                    availableEvents[1].options = countlyEvent.getEvents().map(function(event) {
                        return {label: event.name, value: event.key};
                    });
                }

                availableEvents = availableEvents.filter(function(evt) {
                    return !(self.blacklistedEvents.includes(evt.name));
                });

                return availableEvents;
            }
        },
    }));

    Vue.component("cly-paginate", countlyBaseComponent.extend({
        template: '<div>\
                        <slot v-bind="passedScope"></slot>\
                        <slot name="controls">\
                            <div v-if="hasMultiplePages">\
                                <el-button-group class="bu-p-4">\
                                    <el-button size="small" :disabled="!prevAvailable" @click="goToPrevPage" icon="el-icon-caret-left"></el-button>\
                                    <el-button size="small" :disabled="!nextAvailable" @click="goToNextPage" icon="el-icon-caret-right"></el-button>\
                                </el-button-group>\
                            </div>\
                        </slot>\
                    </div>',
        watch: {
            lastPage: function() {
                this.checkPageBoundaries();
            },
            value: function(newVal) {
                this.page = newVal;
                this.checkPageBoundaries();
            },
        },
        data: function() {
            return {
                page: 1
            };
        },
        methods: {
            setPage: function(target) {
                this.$emit("input", target);
                this.page = target;
            },
            checkPageBoundaries: function() {
                if (this.lastPage > 0 && this.page > this.lastPage) {
                    this.goToLastPage();
                }
                if (this.page < 1) {
                    this.goToFirstPage();
                }
            },
            goToFirstPage: function() {
                this.setPage(1);
            },
            goToLastPage: function() {
                this.setPage(this.lastPage);
            },
            goToPrevPage: function() {
                if (this.prevAvailable) {
                    this.setPage(this.page - 1);
                }
            },
            goToNextPage: function() {
                if (this.nextAvailable) {
                    this.setPage(this.page + 1);
                }
            },
        },
        computed: {
            currentItems: function() {
                return this.items.slice((this.page - 1) * this.perPage, this.page * this.perPage);
            },
            totalPages: function() {
                return Math.ceil(this.items.length / this.perPage);
            },
            lastPage: function() {
                return this.totalPages;
            },
            hasMultiplePages: function() {
                return this.totalPages > 1;
            },
            prevAvailable: function() {
                return this.page > 1;
            },
            nextAvailable: function() {
                return this.totalPages > this.page;
            },
            passedScope: function() {
                return {
                    page: this.page,
                    currentItems: this.currentItems,
                    totalPages: this.totalPages,
                    prevAvailable: this.prevAvailable,
                    nextAvailable: this.nextAvailable
                };
            }
        },
        props: {
            value: {
                default: 1,
                type: Number,
                validator: function(value) {
                    return value > 0;
                }
            },
            items: {
                type: Array,
                required: true
            },
            perPage: {
                type: Number,
                default: 10
            }
        }
    }));

    Vue.component("cly-color-tag", countlyBaseComponent.extend({
        data: function() {
            return {
                selectedTag: this.defaultTag
            };
        },
        methods: {
            click: function(tag) {
                this.selectedTag = tag;
                this.$emit("input", tag);
            },
        },

        props: {
            value: Object,
            tags: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            defaultTag: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        template: '<div class="bu-is-flex bu-is-flex-wrap-wrap bu-is-align-items-center">\
                                <div class="cly-vue-color-tag__color-tag-wrapper"  v-for="(tag,idx) in tags">\
                                <div v-if="tag.value == selectedTag.value" @click="click(tag)" class="cly-vue-color-tag__color-tag cly-vue-color-tag__color-tag__selected bu-is-flex bu-is-align-items-center bu-is-justify-content-center" :style="{backgroundColor: tag.label}">\
                                    <i class="ion-checkmark cly-vue-color-tag__checkmark"></i>\
                                </div>\
                                <div v-else @click="click(tag)" class="cly-vue-color-tag__color-tag bu-is-flex bu-is-align-items-center bu-is-justify-content-center" :style="{backgroundColor: tag.label}"></div>\
                                </div>\
                    </div>'
    }));

    Vue.component("cly-json-editor", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        data: function() {
            return {
                jsonerror: "",
                jsonstr: "",
                isOpen: this.isOpened
            };
        },
        computed: {
            opened: {
                get: function() {
                    this.validateJson();
                    return this.isOpen;
                },
                set: function(val) {
                    this.isOpen = val;
                }
            }
        },
        props: {
            value: String,
            isOpened: {type: Boolean, required: true},
            emitClose: {type: Boolean, required: false, default: false},
            saveLabel: {type: String, required: false, default: CV.i18n("common.save")},
            cancelLabel: {type: String, required: false, default: CV.i18n("common.cancel")},
            title: {type: String, required: false, default: CV.i18n("common.json-editor")},

        },
        watch: {
            value: {
                immediate: true,
                handler: function(newValue) {
                    this.jsonstr = newValue;
                }
            },
        },
        methods: {
            validateJson: function() {
                this.jsonerror = "";
                try {
                    // try to parse
                    if (this.jsonstr) {
                        JSON.parse(this.jsonstr);
                    }
                }
                catch (e) {
                    this.jsonerror = JSON.stringify(e.message);
                }
            },
            prettyFormat: function() {
                // reset error
                var jsonValue = "";
                try {
                    // try to parse
                    jsonValue = JSON.parse(this.jsonstr);
                    this.jsonstr = JSON.stringify(jsonValue, null, 2);
                }
                catch (e) {
                    // Do nothing
                }
            },
            submit: function() {
                this.$emit("input", this.jsonstr);
                this.opened = false;
                if (this.emitClose) {
                    this.$emit("closed");
                }
            },
            cancel: function() {
                this.opened = false;
                if (this.emitClose) {
                    this.$emit("closed");
                }
            }
        },
        template: '<div class="cly-vue-json-editor" v-show="opened">\
                    <slot name="title"><h3 class="bu-pl-4 color-cool-gray-100">{{title}}</h3></slot>\
                    <div class="bu-is-flex bu-is-justify-content-space-between	bu-is-align-items-center bu-px-4 bu-pb-1">\
                    <div>\
                        <div class="text-smallish" v-if="jsonstr && jsonerror"><i class="ion-alert-circled color-danger bu-mr-1"></i>{{i18n("remote-config.json.invalid")}}</div>\
                        <div class="text-smallish" v-if="!jsonerror"><i class="ion-checkmark-circled color-success bu-mr-1"></i>{{i18n("remote-config.json.valid")}}</div>\
                    </div>\
                    <el-button class="color-cool-gray-100" @click="prettyFormat" type="text">{{i18n("remote-config.json.format")}}</el-button>\
                    </div>\
                    <textarea\
                    @input="validateJson"\
                    v-model="jsonstr"\
                    rows="15" \
                    class="cly-vue-json-editor__textarea bu-p-4" \
                    ref="jsonText"\
                    ></textarea>\
                    <slot name="footer">\
                    <div class="bu-p-4 bu-is-justify-content-flex-end bu-is-flex">\
							<el-button size="small" @click="cancel"  class="text-smallish font-weight-bold bg-warm-gray-20" type="default" >{{cancelLabel}}</el-button>\
							<el-button size="small" @click="submit"  class="text-smallish font-weight-bold color-white" type="success">{{saveLabel}}</el-button>\
					</div>\
                    </slot>\
                   </div>'
    }));
    Vue.component("cly-notification", countlyBaseComponent.extend({
        template: '<div v-if="isModalVisible===true" :class="dynamicClasses" class="cly-vue-notification__alert-box">\n' +
                        '<div class="bu-is-flex bu-is-justify-content-space-between">\n' +
                            '<div class="bu-is-flex">\n' +
                                '<img :src="image" class="alert-image bu-mr-4 bu-my-2 bu-ml-2">\n' +
                                '<slot><span class="alert-text" style="margin-block:auto" v-html="innerText">{{text}}</span></slot>\n' +
                            '</div>\n' +
                            '<div v-if="closable"  class="bu-mt-2" >\n' +
                                '<div v-if="size==\'full\'" @click="closeModal" class="bu-mr-2 bu-ml-2" >\n' +
                                    '<slot name="close"><i class="el-icon-close"></i></slot>\n' +
                                '</div>\n' +
                                '<div v-else @click="closeModal" class="bu-mr-2 bu-ml-6">\n' +
                                    '<slot name="close"><i class="el-icon-close"></i></slot>\n' +
                                '</div>\n' +
                            '</div>\n' +
                            '<div v-else class="bu-ml-5">\n' +
                            '</div>\n' +
                        '</div>\n' +
                  '</div>\n',
        mixins: [countlyVue.mixins.i18n],
        props: {
            id: {default: "", type: [String, Number], required: false},
            text: { default: "" },
            color: { default: "light-warning", type: String},
            size: {default: "full", type: String},
            visible: {default: true, type: Boolean},
            closable: {default: true, type: Boolean},
            autoHide: {default: false, type: Boolean},
        },
        data: function() {
            return {
                autoHideTimeout: null,
                DEFAULT_STAY_TIME_IN_MS: 7000, // 7 seconds
                isModalVisible: true,
            };
        },
        watch: {
            visible: {
                immediate: true,
                handler: function(newVisible) {
                    this.isModalVisible = newVisible;
                }
            },
            isModalVisible: function(newVisible) {
                this.$emit("update:visible", newVisible);
            }
        },
        computed: {
            dynamicClasses: function() {
                return ["cly-vue-notification__alert-box__alert-text--" + this.color, "cly-vue-notification__alert-box--" + this.size];
            },
            image: function() {
                if (this.color === "dark-informational" || this.color === "light-informational") {
                    return "images/icons/notification-toast-informational.svg";
                }
                else if (this.color === "light-successful" || this.color === "dark-successful") {
                    return "images/icons/notification-toast-successful.svg";
                }
                else if (this.color === "light-destructive" || this.color === "dark-destructive") {
                    return "images/icons/notification-toast-destructive.svg";
                }
                else if (this.color === "light-warning" || this.color === "dark-warning") {
                    return "images/icons/notification-toast-warning.svg";
                }
            },
            innerText: function() {
                if (this.text) {
                    return this.text;
                }
                return "";
            }
        },
        methods: {
            closeModal: function() {
                this.isModalVisible = false;
                this.$emit('close', this.id);
            },
        },
        mounted: function() {
            if (this.autoHide) {
                this.autoHideTimeout = setTimeout(this.closeModal, this.DEFAULT_STAY_TIME_IN_MS);
            }
        },
        beforeDestroy: function() {
            if (this.autoHide && this.autoHideTimeout) {
                clearTimeout(this.autoHideTimeout);
                this.autoHideTimeout = null;
            }
        }
    }));

    Vue.component("cly-empty-view", countlyBaseComponent.extend({
        template: ' <div class="bu-mt-5 bu-pt-4 bu-is-flex bu-is-flex-direction-column bu-is-align-items-center cly-vue-empty-view">\
                        <slot name="icon">\
                            <div class="bu-mt-6">\
                                <img class="cly-vue-empty-view__img" src="images/icons/empty-plugin.svg"/>\
                            </div>\
                        </slot>\
                        <div class="bu-mt-2 bu-is-flex bu-is-flex-direction-column 	bu-is-align-items-center">\
                            <slot name="title">\
                                <h3 class="color-cool-gray-100 bu-mt-4">{{title}}</h3>\
                            </slot>\
                            <slot name="subTitle">\
                                <div class="bu-mt-4 bu-mb-5 text-medium color-cool-gray-50 bu-has-text-centered cly-vue-empty-view__subtitle"><span v-html="subTitle"></span></div>\
                            </slot>\
                            <slot name="action" v-if="hasCreateRight && hasAction">\
                                <div @click="actionFunc" class="bu-is-clickable button bu-has-text-centered color-blue-100 pointer">{{actionTitle}}</div>\
                            </slot>\
                        </div>\
                    </div>',
        mixins: [
            countlyVue.mixins.i18n
        ],
        props: {
            title: { default: countlyVue.i18n('common.emtpy-view-title'), type: String },
            subTitle: { default: countlyVue.i18n('common.emtpy-view-subtitle'), type: String },
            actionTitle: { default: "Create", type: String },
            actionFunc: { default: null, type: Function },
            hasAction: {default: false, type: Boolean},
            hasCreateRight: { default: true, type: Boolean }
        },
        data: function() {
            return {};
        },
        methods: {
        }
    }));

    var BaseEmptyViewForElements = _mixins.BaseContent.extend({
        props: {
            image: {default: 'images/icons/empty-view-icon.svg', type: String},
            title: { default: countlyVue.i18n('common.emtpy-view-title'), type: String },
            subTitle: { default: countlyVue.i18n('common.emtpy-view-subtitle'), type: String },
            height: {default: 0, type: Number},
            classes: {
                type: Object,
                default: function() {
                    return {
                        'bu-py-6': true
                    };
                }
            }
        },
        data: function() {
            return {};
        },
        computed: {
            topStyle: function() {
                if (this.height) {
                    return {height: this.height + "px"};
                }
            }
        },
        template: ' <div :style="topStyle" :class="[\'bu-is-flex bu-is-flex-direction-column bu-is-align-items-center bu-is-justify-content-center\', classes]" style="height: 100%;opacity: 0.6">\
                        <slot name="icon">\
                            <div>\
                                <img :src="image"/>\
                            </div>\
                        </slot>\
                        <div class="bu-mt-2">\
                            <slot name="title">\
                                <h4 class="color-cool-gray-100 bu-has-text-centered">{{title}}</h4>\
                            </slot>\
                            <slot name="subTitle">\
                                <div class="bu-mt-1 text-small color-cool-gray-50 bu-has-text-centered">{{subTitle}}</div>\
                            </slot>\
                        </div>\
                    </div>',
    });

    Vue.component("cly-empty-chart", BaseEmptyViewForElements);

    Vue.component("cly-empty-datatable", BaseEmptyViewForElements);

    Vue.component("cly-blank", BaseEmptyViewForElements);

    Vue.component("cly-breadcrumbs", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            crumbs: {
                type: Array,
                default: function() {
                    return [];
                }
            },
        },
        template: "<div class='bu-level cly-breadcrumbs bu-mb-5'>\
                        <div v-for='(crumb, index) in crumbs'\
                            :class='[\"bu-level-item text-medium bu-mr-0\",\
                                    {\"bu-ml-2\": (index !== 0)},\
                                    {\"color-cool-gray-40\": (index === (crumbs.length - 1))}]'>\
                            <a :href='crumb.url'>{{crumb.label}}</a>\
                            <span class='bu-ml-2' v-if='index !== (crumbs.length - 1)'>></span>\
                        </div>\
                    </div>"
    }));


    Vue.component("cly-multiplex", {
        props: {
            children: {
                type: Array,
                default: function() {
                    return [];
                }
            },
        },
        template: '<div>\
                        <component :is="comp" v-for="comp in children">\
                            v-bind="$attrs"\
                            v-on="$listeners">\
                        </component>\
                    </div>'
    });
}(window.countlyVue = window.countlyVue || {}));
