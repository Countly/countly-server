/* global Vue, CV, $, app, countlyEvent, countlyGlobal, countlyAuth, VueJsonPretty, ElementTiptapPlugin, countlyCommon CountlyHelpers*/

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
                link: {type: String, required: false},
                testId: {type: String, required: false}
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
            template: '<a @click="back" class="cly-vue-back-link" :data-test-id="testId + \'-back-link-label\'"> \n' +
                            '<span class="text-medium bu-is-capitalized"><i class="fas fa-arrow-left bu-pr-3" :data-test-id="testId + \'-back-link-icon\'"></i>{{innerTitle}}</span>\n' +
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

    Vue.component('cly-status-tag', countlyBaseComponent.extend({
        props: {
            color: {
                default: 'green',
                type: String
            },

            loading: {
                default: false,
                type: Boolean
            },

            size: {
                default: 'unset',
                type: String
            },

            text: {
                required: true,
                type: String
            }
        },

        computed: {
            dynamicClasses() {
                const classes = [];

                if (this.size === 'small') {
                    classes.push('cly-vue-status-tag--small');
                }

                if (this.loading) {
                    classes.push('cly-vue-status-tag--gray');
                }
                else {
                    classes.push(`cly-vue-status-tag--${this.color}`);
                }

                return classes;
            }
        },

        template: `
            <div
                class="cly-vue-status-tag"
                :class="dynamicClasses"
            >
                <div class="cly-vue-status-tag__blink" />
                <div
                    v-if="loading"
                    class="cly-vue-status-tag__skeleton"
                />
                <template v-else>
                    {{ text }}
                </template>
            </div>
        `
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
            },
            isModal: {
                type: Boolean,
                required: false,
                default: false
            }
        },
        computed: {
            leftPadding: function() {
                if (this.hasDiff && this.isModal) {
                    var dd = document.getElementById('cly-vue-sidebar').getBoundingClientRect();
                    var value = dd.width || 272;
                    return "left:" + value + 'px; width:calc(100% - ' + value + 'px)';
                }
                else {
                    return "";
                }
            },
            hasDiff: function() {
                return this.diff.length > 0;
            },
            madeChanges: function() {
                return this.i18n("common.diff-helper.changes", this.diff.length);
            },
            skinToApply: function() {
                return this.isModal ? 'cly-vue-diff-helper-modal-wrapper' : '';
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
        template:
				'<div :class="skinToApply" v-if="hasDiff" :style="leftPadding" >' +
					'<div  v-if="isModal" class="cly-vue-diff-helper-modal bu-pl-2">\n' +
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
					'</div>' +
					'<div v-else class="cly-vue-diff-helper bu-pl-2">\n' +
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
					'</div>' +
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
            tooltip: {type: String, default: ''},
            testId: {type: String, default: "cly-metric-card-test-id"},
            isEstimate: {type: Boolean, default: false},
            estimateTooltip: {type: String, default: ''}
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
        template: '<div class="cly-vue-metric-card bu-column bu-is-flex" :data-test-id="\'metric-card-\' + testId + \'-column\'" :class="topClasses" :style="metricStyles">\
                        <div class="cly-vue-metric-card__wrapper bu-p-5 bu-is-flex bu-is-justify-content-space-between has-ellipsis" :data-test-id="\'metric-card-\' + testId + \'-column-wrapper\'">\
                            <cly-progress-donut class="bu-pr-4 bu-is-flex" :test-id="\'metric-card-\' + testId + \'-column\'" v-if="isPercentage" :color="color" :percentage="number"></cly-progress-donut>\
                            <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between has-ellipsis">\
                                <div class="bu-is-flex bu-is-align-items-center">\
                                    <span :data-test-id="\'metric-card-\' + testId + \'-column-label\'" class="text-medium has-ellipsis" v-tooltip="label"><slot>{{label}}</slot></span>\
                                    <cly-tooltip-icon :data-test-id="\'metric-card-\' + testId + \'-column-tooltip\'" v-if="tooltip.length > 0" class="bu-is-flex-grow-1 bu-ml-1" :tooltip="tooltip"></cly-tooltip-icon>\
                                </div>\
                                <div :class=numberClasses>\
                                    <h2 :data-test-id="\'metric-card-\' + testId + \'-column-number\'" v-if="isEstimate" v-tooltip="estimateTooltip" class="is-estimate">~<slot name="number">{{formattedNumber}}</slot></h2>\
                                    <h2 :data-test-id="\'metric-card-\' + testId + \'-column-number\'" v-else><slot name="number">{{formattedNumber}}</slot></h2>\
                                    <div class="bu-pl-2 bu-is-flex-grow-1" :data-test-id="\'metric-card-\' + testId + \'-description\'"><slot name="description"><span :data-test-id="\'metric-card-\' + testId + \'-column-description\'" class="text-medium">{{description}}</span></slot></div>\
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
            },
            testId: {
                type: String,
                default: "metric-breakdown-test-id",
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
                    content: countlyCommon.unescapeHtml(this.tooltip),
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
        template: `
        <cly-select-x
            :options="options"
            :auto-commit="mode !== \'multi-check\'"
            :mode="mode"
            :max-items="multipleLimit"
            v-bind="$attrs"
            v-on="$listeners">
            <template
                v-slot:option-prefix="option">
                <div v-if="showAppImage && dropdownApps[option.value] && dropdownApps[option.value].image" class="cly-vue-dropdown__dropdown-icon bu-mt-1 bu-mr-1"
                    :style="{backgroundImage: \'url(\' + dropdownApps[option.value].image + \')\'}">
                </div>
            </template>
            <template
                v-if="showAppImage && selectedApps && dropdownApps[selectedApps]"
                v-slot:label-prefix>
                <div class="cly-vue-dropdown__dropdown-icon bu-ml-1 bu-mr-1"
                    :style="{backgroundImage: \'url(\' + dropdownApps[selectedApps].image + \')\'}">
                </div>
            </template>
        </cly-select-x>`,
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
            },
            showAppImage: {
                type: Boolean,
                default: false,
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
            selectedApps: function() {
                return this.$attrs.value;
            },
            apps: function() {
                var apps = countlyGlobal.apps || {};
                let formattedApps = [];

                if (this.auth && this.auth.feature && this.auth.permission) {
                    var expectedPermission = this.auth.permission,
                        targetFeature = this.auth.feature;

                    formattedApps = Object.keys(apps).reduce(function(acc, key) {
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
                else {
                    formattedApps = Object.keys(apps).map(function(key) {
                        return {
                            label: countlyCommon.unescapeHtml(apps[key].name),
                            value: apps[key]._id
                        };
                    });
                }

                return formattedApps.sort(function(a, b) {
                    const aLabel = a?.label || '';
                    const bLabel = b?.label || '';
                    const locale = countlyCommon.BROWSER_LANG || 'en';

                    if (aLabel && bLabel) {
                        return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
                    }

                    // Move items with no label to the end
                    if (!aLabel && bLabel) {
                        return 1;
                    }

                    if (aLabel && !bLabel) {
                        return -1;
                    }

                    return 0;
                });
            }
        },
        data: function() {
            return {
                dropdownApps: countlyGlobal.apps || {}
            };
        }
    });

    Vue.component("cly-event-select", countlyBaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        template: '<div class="cly-event-select">\
                    <cly-select-x\
                        :test-id="testId"\
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
                        v-if="!isLoading"\
                        v-on="$listeners">\
                        <template v-slot:header="selectScope">\
                            <h4 class="color-cool-gray-100 bu-mb-2" v-if="hasTitle">{{title}}</h4>\
                            <el-radio-group\
                                :value="selectScope.activeTabId"\
                                @input="selectScope.updateTab"\
                                size="small">\
                                <el-radio-button :test-id="testId + \'-tab-\' + idx" v-for="(tab,idx) in selectScope.tabs" :key="tab.name" :label="tab.name">{{tab.label}}</el-radio-button>\
                            </el-radio-group>\
                        </template>\
                    </cly-select-x>\
                    <div v-else class="cly-event-select__loading el-loading-spinner"><i class="el-icon-loading bu-mr-2"></i><p class="el-loading-text">Loading...</p></div>\
                </div>',
        props: {
            blacklistedEvents: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            width: { type: [Number, Object, String], default: 'fit-content'},
            adaptiveLength: {type: Boolean, default: true},
            arrow: {type: Boolean, default: false},
            title: { type: String, require: false},
            selectedApp: {type: String, required: false, default: ''},
            disabled: {type: Boolean, default: false},
            testId: {type: String, default: "event-select-test-id"}
        },
        data: function() {
            return {
                singleOptionSettings: {
                    autoPick: true,
                    hideList: true
                },
                availableEvents: [],
                isLoading: false
            };
        },
        computed: {
            hasTitle: function() {
                return !!this.title;
            }
        },
        methods: {
            prepareAvailableEvents: function() {
                var self = this;
                var preparedEventList = [
                    {
                        "label": this.i18n('sidebar.analytics.sessions'),
                        "name": "[CLY]_session",
                        "options": [ { label: this.i18n('sidebar.analytics.sessions'), value: '[CLY]_session' } ]
                    },
                    {
                        "label": this.i18n('sidebar.events'),
                        "name": "event",
                        "options": []
                    }
                ];
                if (countlyGlobal.plugins.indexOf('views') !== -1) {
                    preparedEventList.push({
                        "label": this.i18n('internal-events.[CLY]_view'),
                        "name": "[CLY]_view",
                        "options": [ { label: this.i18n('internal-events.[CLY]_view'), value: '[CLY]_view' } ]
                    });
                }

                var feedbackOptions = [];
                if (countlyGlobal.plugins.indexOf('star-rating') !== -1) {
                    feedbackOptions.push({ label: this.i18n('internal-events.[CLY]_star_rating'), value: '[CLY]_star_rating' });
                }

                if (countlyGlobal.plugins.indexOf('surveys') !== -1) {
                    feedbackOptions.push({ label: this.i18n('internal-events.[CLY]_nps'), value: '[CLY]_nps' });
                    feedbackOptions.push({ label: this.i18n('internal-events.[CLY]_survey'), value: '[CLY]_survey' });
                }
                if (feedbackOptions.length > 0) {
                    preparedEventList.push({
                        "label": this.i18n("sidebar.feedback"),
                        "name": "feedback",
                        "options": feedbackOptions
                    });
                }

                var llmEvents = [];
                llmEvents.push(
                    {
                        "label": this.i18n('internal-events.[CLY]_llm_interaction'),
                        "value": "[CLY]_llm_interaction"
                    },
                    {
                        "label": this.i18n('internal-events.[CLY]_llm_interaction_feedback'),
                        "value": "[CLY]_llm_interaction_feedback"
                    },
                    {
                        "label": this.i18n('internal-events.[CLY]_llm_tool_used'),
                        "value": "[CLY]_llm_tool_used"
                    },
                    {
                        "label": this.i18n('internal-events.[CLY]_llm_tool_usage_parameter'),
                        "value": "[CLY]_llm_tool_usage_parameter"
                    }
                );
                if (llmEvents.length > 0) {
                    preparedEventList.push({
                        "label": this.i18n("llm.events"),
                        "name": "llm",
                        "options": llmEvents
                    });
                }


                if (countlyGlobal.plugins.indexOf('compliance-hub') !== -1) {
                    preparedEventList.push({
                        "label": this.i18n('internal-events.[CLY]_consent'),
                        "name": "[CLY]_consent",
                        "options": [ { label: this.i18n('internal-events.[CLY]_consent'), value: '[CLY]_consent' } ]
                    });
                }

                if (countlyGlobal.plugins.indexOf('crashes') !== -1) {
                    preparedEventList.push({
                        "label": this.i18n('internal-events.[CLY]_crash'),
                        "name": "[CLY]_crash",
                        "options": [ { label: this.i18n('internal-events.[CLY]_crash'), value: '[CLY]_crash' } ]
                    });
                }

                if (countlyGlobal.plugins.indexOf('push') !== -1) {
                    /*availableEvents.push({
                        "label": 'Push Sent',
                        "name": "[CLY]_push_sent",
                        "options": [
                            { label: this.i18n('internal-events.[CLY]_push_sent'), value: '[CLY]_push_sent' }
                        ]
                    });*/
                    preparedEventList.push({
                        "label": 'Push Actioned',
                        "name": "[CLY]_push_action",
                        "options": [
                            { label: this.i18n('internal-events.[CLY]_push_action'), value: '[CLY]_push_action' }
                        ]
                    });
                }

                if (countlyGlobal.plugins.indexOf('journey_engine') !== -1) {
                    preparedEventList.push({
                        "label": this.i18n('internal-events.[CLY]_journey_engine'),
                        "name": "Journey",
                        "options": [
                            { label: this.i18n('internal-events.[CLY]_journey_engine_start'), value: '[CLY]_journey_engine_start' },
                            { label: this.i18n('internal-events.[CLY]_journey_engine_end'), value: '[CLY]_journey_engine_end' },
                            { label: this.i18n('internal-events.[CLY]_content_shown'), value: '[CLY]_content_shown' },
                            { label: this.i18n('internal-events.[CLY]_content_interacted'), value: '[CLY]_content_interacted' }
                        ]
                    });
                }

                // {
                //     "label": this.i18n('internal-events.[CLY]_push_action'),
                //     "name": "[CLY]_push_action",
                //     "noChild": true
                // }

                return new Promise(function(resolve) {
                    if (this.selectedApp) {
                        self.isLoading = true;
                        countlyEvent.getEventsForApps([this.selectedApp], function(eData) {
                            preparedEventList[1].options = eData.map(function(e) {
                                return {label: countlyCommon.unescapeHtml(e.name), value: e.value};
                            });
                        });
                        preparedEventList = preparedEventList.filter(function(evt) {
                            return !(self.blacklistedEvents.includes(evt.name));
                        });
                        self.isLoading = false;
                        resolve(preparedEventList);
                    }
                    else {
                        self.isLoading = true;
                        $.when(countlyEvent.refreshEvents()).then(function() {
                            const events = countlyEvent.getEvents();
                            preparedEventList[1].options = events.map(function(event) {
                                return {label: countlyCommon.unescapeHtml(event.name), value: event.key};
                            });
                            preparedEventList = preparedEventList.filter(function(evt) {
                                return !(self.blacklistedEvents.includes(evt.name));
                            });
                            self.isLoading = false;
                            resolve(preparedEventList);
                        });
                    }
                });
            }
        },
        created: async function() {
            this.availableEvents = await this.prepareAvailableEvents();
        }
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
                                <div v-if="tag.value == selectedTag.value" @click="click(tag)" :data-test-id="`color-tag-${idx}`" class="cly-vue-color-tag__color-tag cly-vue-color-tag__color-tag__selected bu-is-flex bu-is-align-items-center bu-is-justify-content-center" :style="{backgroundColor: tag.label}">\
                                    <i class="ion-checkmark cly-vue-color-tag__checkmark"></i>\
                                </div>\
                                <div v-else @click="click(tag)" :data-test-id="`color-tag-${idx}`" class="cly-vue-color-tag__color-tag bu-is-flex bu-is-align-items-center bu-is-justify-content-center" :style="{backgroundColor: tag.label}"></div>\
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
        template: `
            <div
                v-if="isModalVisible"
                class="cly-vue-notification__alert-box"
                :class="dynamicClasses"
            >
                <div class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center">
                    <div class="bu-is-flex" style="width:100%">
                        <img
                            class="alert-image bu-p-2"
                            data-test-id="cly-notification-img"
                            :src="image"
                        >
                        <div :style="dynamicStyle">
                            <slot>
                                <span
                                    class="alert-text"
                                    data-test-id="cly-notification-text"
                                    style="margin-block:auto"
                                    v-html="innerText"
                                >
                                    {{ text }}
                                </span>
                            </slot>
                            <span
                                v-if="goTo.title"
                                class="bu-is-flex cursor-pointer"
                            >
                                <a
                                    class="bu-level-item bu-has-text-link bu-has-text-weight-medium"
                                    @click="goToUrl"
                                >
                                    {{ goTo.title }}
                                </a>
                            </span>
                        </div>
                    </div>
                    <div v-if="closable">
                        <div
                            :class="closeIconDynamicClasses"
                            @click="closeModal"
                        >
                            <slot name="close">
                                <i
                                    :data-test-id="closeIconDataId"
                                    class="cly-vue-notification__alert-box__close-icon el-icon-close bu-mr-2"
                                />
                            </slot>
                        </div>
                    </div>
                    <div
                        v-else
                        class="bu-ml-5"
                    />
                </div>
            </div>
        `,
        mixins: [countlyVue.mixins.i18n],
        props: {
            id: {default: "", type: [String, Number], required: false},
            text: { default: "" },
            color: { default: "light-warning", type: String},
            size: {default: "full", type: String},
            visible: {default: true, type: Boolean},
            closable: {default: true, type: Boolean},
            autoHide: { default: false, type: Boolean },
            goTo: {
                default() {
                    return { title: '', url: '', from: '' };
                },
                type: Object
            },
            customWidth: { default: "", type: String },
            toast: { default: false, type: Boolean }
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
            closeIconDynamicClasses: function() {
                if (this.size === 'full') {
                    return 'bu-ml-2';
                }

                return 'bu-ml-3 bu-pl-3 bu-ml-3';
            },

            closeIconDataId: function() {
                if (this.size === 'full') {
                    return 'cly-notification-full-size-close-icon';
                }

                return 'cly-notification-modal-close-icon';
            },

            dynamicClasses: function() {
                var classes = ["cly-vue-notification__alert-box__alert-text--" + this.color, "cly-vue-notification__alert-box--" + this.size];
                if (this.customWidth !== "") {
                    classes.push(`notification-toasts__item--${this.customWidth}`);
                }
                return classes;
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
            },
            dynamicStyle: function() {
                let style = {
                    "display": "flex",
                    "flex-direction": this.toast ? "column" : "row",
                    "width": "100%"
                };
                if (this.toast) {
                    style.gap = "5px";
                }
                else {
                    style["justify-content"] = "space-between";
                }
                return style;
            }
        },
        methods: {
            closeModal: function() {
                this.isModalVisible = false;
                this.$emit('close', this.id);
            },
            goToUrl: function() {
                CountlyHelpers.goTo(this.goTo);
            }
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
        template: '<div :class="classes">\
                        <slot name="icon">\
                            <div v-if="visual!==\'framed\'" class="bu-mt-6">\
                                <img :data-test-id="testId + \'-empty-view-icon\'" class="cly-vue-empty-view__img" src="images/icons/empty-plugin.svg"/>\
                            </div>\
                        </slot>\
                        <div class="bu-mt-2 bu-is-flex bu-is-flex-direction-column">\
                            <slot name="title">\
								<h3 v-if="visual==\'framed\'" :data-test-id="testId + \'-empty-view-title\'" class="bu-ml-5 color-cool-gray-100 bu-mt-4">{{title}}</h3>\
                                <h3 v-else :data-test-id="testId + \'-empty-view-title\'" class="bu-has-text-centered color-cool-gray-100 bu-mt-4">{{title}}</h3>\
                            </slot>\
                            <slot name="subTitle">\
								<div v-if="visual==\'framed\'" class="bu-mt-3 bu-mb-5 bu-ml-5 text-medium color-cool-gray-50 cly-vue-empty-view__subtitle"><span :data-test-id="testId + \'-empty-view-subtitle\'" v-html="subTitle"></span></div>\
                                <div v-else class="bu-mt-4 bu-mb-5 text-medium color-cool-gray-50 bu-has-text-centered cly-vue-empty-view__subtitle"><span :data-test-id="testId + \'-empty-view-subtitle\'" v-html="subTitle"></span></div>\
                            </slot>\
                            <slot name="action" v-if="hasCreateRight && hasAction">\
								<div v-if="visual==\'framed\'" style=\'width: 200px\' class="bu-ml-5 bu-pb-4"><el-button   :data-test-id="testId + \'-empty-view-action-button\'" @click="actionFunc"><i class=\'cly-countly-icon-outline cly-countly-icon-outline-plus-circle-16px bu-pr-4 bu-mr-1\'></i> {{actionTitle}}\</el-button></div>\
                                <div v-else :data-test-id="testId + \'-empty-view-action-button\'" @click="actionFunc" class="bu-is-clickable button bu-has-text-centered color-blue-100 pointer">{{actionTitle}}</div>\
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
            hasCreateRight: { default: true, type: Boolean },
            testId: {type: String, default: "cly-empty-view"},
            visual: {type: String, default: "old"}
        },
        data: function() {
            var settings = {
                classes: 'bu-mt-5 bu-pt-4 bu-is-flex bu-is-flex-direction-column bu-is-align-items-center cly-vue-empty-view',
                align: 'center',
            };
            if (this.visual === "framed") {
                settings.classes = 'bu-pb-5 bu-pt-4 bu-pl-3 bu-is-flex bu-is-flex-direction-column bu-is-align-items-left cly-vue-empty-view cly-vue-empty-view-framed';
                settings.align = 'left';
            }

            return settings;
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
            },
            testId: {type: String, default: "cly-empty-view"}
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
                                <img :data-test-id="testId + \'-empty-logo\'" :src="image"/>\
                            </div>\
                        </slot>\
                        <div class="bu-mt-2">\
                            <slot name="title">\
                                <h4 :data-test-id="testId + \'-empty-title\'" class="color-cool-gray-100 bu-has-text-centered">{{title}}</h4>\
                            </slot>\
                            <slot name="subTitle">\
                                <div :data-test-id="testId + \'-empty-subtitle\'" class="bu-mt-1 text-small color-cool-gray-50 bu-has-text-centered">{{subTitle}}</div>\
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

    Vue.component("cly-list-drawer", countlyBaseComponent.extend({
        props: {
            list: {
                type: Array,
                required: true,
            },
            dropdownText: {
                type: String,
                default: 'Listed item(s) will be affected by this action',
                required: false,
            },
        },
        data: function() {
            return {
                isOpen: false,
                options: {
                    vuescroll: {
                        sizeStrategy: 'number',
                    },
                    scrollPanel: {
                        initialScrollX: false,
                    },
                    rail: {
                        gutterOfSide: "4px",
                        gutterOfEnds: "16px",
                        keepShow: false,
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        keepShow: false,
                    }
                },
            };
        },
        methods: {
            toggleList: function() {
                this.isOpen = !this.isOpen;
            },
        },
        template: '<div class="cly-list-drawer">\
                        <div class="cly-list-drawer__text-clickable bu-pt-4 bu-pb-3 bu-has-text-weight-medium" @click="toggleList">\
                            {{ dropdownText }}\
                            <i class="cly-io-16 cly-io cly-io-chevron-down" :class="{ \'rotate-icon\': isOpen }"></i>\
                        </div>\
                        <div v-if="isOpen" class="cly-list-drawer__list">\
                            <vue-scroll :ops="options">\
                                <div>\
                                    <ul>\
                                        <li v-for="ev in list">{{ev}}</li>\
                                    </ul>\
                                </div>\
                            </vue-scroll>\
                        </div>\
                    </div>'
    }));

    Vue.component("cly-auto-refresh-toggle", countlyBaseComponent.extend({
        template: "<div class='cly-vue-auto-refresh-toggle'>\
                        <div v-if='autoRefresh' class='bu-level-item'>\
                            <span class='cly-vue-auto-refresh-toggle__refresh--enabled' :data-test-id='testId + \"-auto-refresh-toggle-is-label\"'>{{i18n('auto-refresh.is')}}</span>\
                            <span class='cly-vue-auto-refresh-toggle__refresh--enabled-color' :data-test-id='testId + \"-auto-refresh-toggle-enabled-label\"'>{{i18n('auto-refresh.enabled')}}</span>\
                            <span v-tooltip.top-left='getRefreshTooltip()' class='bu-ml-1 bu-mr-2 cly-vue-auto-refresh-toggle__tooltip ion-help-circled' :data-test-id='testId + \"-auto-refresh-toggle-tooltip\"'></span>\
                            <el-button @click='stopAutoRefresh()'><i class='bu-ml-2 fa fa-stop-circle' :data-test-id='testId + \"-auto-refresh-toggle-button\"'></i> {{i18n('auto-refresh.stop')}}\
                            </el-button>\
                        </div>\
                        <div class='bu-level-item' :class=\"{ 'bu-is-hidden': autoRefresh }\">\
                            <el-switch v-model='autoRefresh' :test-id='testId + \"-auto-refresh-toggle\"'>\
                            </el-switch>\
                            <span class='cly-vue-auto-refresh-toggle__refresh--disabled' :data-test-id='testId + \"-auto-refresh-toggle-disabled-label\"'>{{i18n('auto-refresh.enable')}}</span>\
                            <span v-tooltip.left='getRefreshTooltip()' class='bu-ml-2 cly-vue-auto-refresh-toggle__tooltip ion-help-circled' :data-test-id='testId + \"-auto-refresh-toggle-disabled-tooltip\"'></span>\
                        </div>\
                    </div>",
        mixins: [countlyVue.mixins.i18n],
        data: function() {
            return {
                autoRefresh: false
            };
        },
        props: {
            feature: { required: true, type: String },
            defaultValue: { required: false, default: false, type: Boolean},
            testId: { required: false, default: 'cly-test-id', type: String}
        },
        methods: {
            getRefreshTooltip: function() {
                return this.i18n('auto-refresh.help');
            },
            stopAutoRefresh: function() {
                this.autoRefresh = false;
            }
        },
        watch: {
            autoRefresh: function(newValue) {
                localStorage.setItem("auto_refresh_" + this.feature + "_" + countlyCommon.ACTIVE_APP_ID, newValue);
            },
        },
        mounted: function() {
            var autoRefreshState = localStorage.getItem("auto_refresh_" + this.feature + "_" + countlyCommon.ACTIVE_APP_ID);
            if (autoRefreshState) {
                this.autoRefresh = autoRefreshState === "true";
            }
            else {
                localStorage.setItem("auto_refresh_" + this.feature + "_" + countlyCommon.ACTIVE_APP_ID, this.defaultValue);
                this.autoRefresh = this.defaultValue;
            }
        }
    }));

}(window.countlyVue = window.countlyVue || {}));
