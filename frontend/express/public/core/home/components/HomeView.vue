<template>
    <div class="cly-vue-home">
        <cly-header
            :title="i18n('sidebar.home')"
        >
            <template v-slot:header-right>
                <cly-select-x
                    v-if="showComponentSelector"
                    search-placeholder=""
                    placeholder="i18n('dashboard.customize-home')"
                    :title="i18n('dashboard.customize-home')"
                    mode="multi-check-sortable"
                    placement="bottom-end"
                    :width="392"
                    :auto-commit="false"
                    :hide-default-tabs="true"
                    :hide-all-options-tab="true"
                    :searchable="false"
                    :options="componentSelector"
                    @input="setSelectedComponents"
                    v-model="selectedDynamicComponents"
                    showSelectedCount >
                    <template v-slot:trigger>
                        <el-button size="small" icon="cly-icon-btn cly-icon-menu" :data-test-id="`button-${i18n('sidebar.home').toLowerCase().replaceAll(/\s/g, '-')}-${i18n('common.customize').toLowerCase().replaceAll(/\s/g, '-')}`"> {{i18n('common.customize')}} </el-button>
                    </template>
                </cly-select-x>
                <cly-more-options size="small" class="bu-ml-2" :data-test-id="`button-three-dot-${i18n('sidebar.home').toLowerCase().replaceAll(/\s/g, '-')}`" @command="selected">
                    <el-dropdown-item command="download" :data-test-id="`button-item-${i18n('common.download').toLowerCase().replaceAll(/\s/g, '-')}`">
                      {{i18n('common.download')}}
                    </el-dropdown-item>
                </cly-more-options>

            </template>
        </cly-header>
        <cly-main>
            <div id="main_home_view">
                <div v-for="(item0, idx0) in topComponents" class="bu-pb-5 bu-mt-3">
                    <component v-if="item0.component" v-bind:is="item0.component"></component>
                </div>
                <cly-date-picker-g class="bu-mt-2"></cly-date-picker-g>
                <div  v-for="(item, idx) in ordered"  class="componentBlock">
                    <div v-if="item.itemgroup">
                        <div class="bu-columns bu-is-gapless">
                            <div  v-for="(item0, idx0) in item.data" v-if="registredComponents[item0._id]" class="bu-column bu-is-6">
                                <div :class="item0.classes">
                                    <component v-if="registredComponents[item0._id].component" v-bind:is="registredComponents[item0._id].component"></component>
                                </div>
                            </div>
                        </div>
                    </div>
                    <component v-else-if="registredComponents[item._id].component" v-bind:is="registredComponents[item._id].component"></component>
                </div>
                <cly-empty-view v-if="ordered.length ==0 && topComponents.length == 0 && !isLoading"
                    :title="i18n('dashboard.empty-title')"
                    :subTitle="i18n('dashboard.empty-text')">
                </cly-empty-view>
            </div>
        </cly-main>
    </div>
</template>

<script>
import jQuery from 'jquery';
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import { dataMixin } from '../../../javascripts/countly/vue/container.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';

import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySelectX from '../../../javascripts/components/input/select-x.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyEmptyView from '../../../javascripts/components/helpers/cly-empty-view.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySelectX,
        ClyMoreOptions,
        ClyDatePickerG,
        ClyEmptyView
    },
    mixins: [
        countlyVue.mixins.commonFormatters,
        countlyVue.mixins.i18n,
        autoRefreshMixin,
        dataMixin({
            'homeComponents': '/home/widgets'
        })
    ],
    data: function() {
        return {
            description: countlyVue.i18n('dashboard.home-desc'),
            allComponents: [],
            topComponents: [],
            componentSelector: [],
            showComponentSelector: true,
            selectedDynamicComponents: [],
            selectedText: "",
            registredComponents: {},
            ordered: [],
            isLoading: true
        };
    },
    mounted: function() {
        this.loadAllWidgets();
    },
    methods: {
        refresh: function() {
            this.loadAllWidgets();
        },
        dateChanged: function() {
            this.loadAllWidgets();
        },
        loadAllWidgets: function() {
            var userSettings = {};
            if (countlyGlobal && countlyGlobal.member && countlyGlobal.member.homeSettings && countlyCommon.ACTIVE_APP_ID) {
                userSettings = countlyGlobal.member.homeSettings[countlyCommon.ACTIVE_APP_ID] || {};
            }
            var allComponents = this.homeComponents;

            var appType = "";
            if (countlyGlobal && countlyGlobal.apps && countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
                appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            }

            for (var k = 0; k < allComponents.length; k++) {
                var available = false;
                if (allComponents[k].available) {
                    available = allComponents[k].available.default || false;
                    if (typeof allComponents[k].available[appType] !== 'undefined') {
                        available = allComponents[k].available[appType];
                    }
                }
                if (available) {
                    var enabled = false;
                    var order = allComponents[k].order || 0;
                    if (allComponents[k].enabled) {
                        enabled = allComponents[k].enabled.default || false;
                        if (typeof allComponents[k].enabled[appType] !== 'undefined') {
                            enabled = allComponents[k].enabled[appType];
                        }
                    }

                    if (typeof userSettings[allComponents[k]._id] !== "undefined") {
                        enabled = userSettings[allComponents[k]._id].enabled || false;
                        if (typeof userSettings[allComponents[k]._id].order !== "undefined") {
                            order = userSettings[allComponents[k]._id].order;
                        }
                    }

                    if (!this.registredComponents[allComponents[k]._id]) {

                        if (enabled && !allComponents[k].placeBeforeDatePicker && this.selectedDynamicComponents.indexOf(allComponents[k]._id) === -1) {
                            this.selectedDynamicComponents.push(allComponents[k]._id);
                        }
                        this.registredComponents[allComponents[k]._id] = {"hide_header": allComponents[k].hide_header || false, "width": allComponents[k].width, "enabled": enabled, _id: allComponents[k]._id, "label": allComponents[k].label, "description": allComponents[k].description, "order": allComponents[k].order, "placeBeforeDatePicker": allComponents[k].placeBeforeDatePicker, "component": allComponents[k].component, "linkTo": allComponents[k].linkTo};
                        if (this.registredComponents[allComponents[k]._id].placeBeforeDatePicker) {
                            if (this.topComponents.length === 0) {
                                this.topComponents.push(this.registredComponents[allComponents[k]._id]);
                            }
                            else {
                                var placeAt = 0;
                                for (var zz = this.topComponents.length; zz > 0; zz--) {
                                    if (this.topComponents[zz - 1].order < allComponents[k].order) {
                                        placeAt = zz;
                                        break;
                                    }

                                }
                                this.topComponents.splice(placeAt, 0, this.registredComponents[allComponents[k]._id]);
                            }
                        }
                    }
                    this.registredComponents[allComponents[k]._id].enabled = enabled;
                    this.registredComponents[allComponents[k]._id].order = order;
                }

            }

            this.calculatePlacedComponents();
            this.isLoading = false;

        },
        calculatePlacedComponents: function() {
            this.componentSelector = [];
            this.allComponents = [];
            var forOrdering = [];

            for (var k in this.registredComponents) {
                if (!this.registredComponents[k].placeBeforeDatePicker) {
                    this.componentSelector.push({"fixed": this.registredComponents[k].placeBeforeDatePicker, "value": this.registredComponents[k]._id, label: countlyVue.i18n(this.registredComponents[k].label), "order": this.registredComponents[k].order});
                }
                if (this.registredComponents[k].enabled) {
                    if (!this.registredComponents[k].placeBeforeDatePicker) {
                        forOrdering.push({"_id": k, "size": this.registredComponents[k].width || 12, "order": this.registredComponents[k].order});
                    }
                }
            }
            this.componentSelector = this.componentSelector.sort(function(a, b) {
                return a.order - b.order;
            });
            forOrdering = forOrdering.sort(function(a, b) {
                return a.order - b.order;
            });

            for (var z = 0; z < forOrdering.length; z++) {
                if (forOrdering[z].size && forOrdering[z].size === 6) {
                    if (z + 1 < forOrdering.length && forOrdering[z + 1].size === 6) {
                        forOrdering[z].classes = "bu-pr-3";
                        forOrdering[z + 1].classes = "bu-pl-1";
                        forOrdering[z] = {"itemgroup": true, data: [forOrdering[z], forOrdering[z + 1]] };
                        forOrdering.splice(z + 1, 1);
                    }
                }
                else {
                    forOrdering[z].classes = "";
                }
                if (z === 0) {
                    forOrdering[z].topGapClasses = "bu-pt-4";
                }
                else {
                    forOrdering[z].topGapClasses = "bu-pt-5 bu-mt-3";
                }
            }


            var not_changed = true;
            if (this.ordered.length === forOrdering.length) {
                for (var z1 = 0; z1 < forOrdering.length; z1++) {
                    if (forOrdering[z1]._id !== this.ordered[z1]._id) {
                        not_changed = false;
                    }
                }
            }
            else {
                not_changed = false;
            }

            if (!not_changed) {

                this.ordered = [];
                var self = this;
                setTimeout(function() {
                    self.ordered = forOrdering;
                }, 1000);
            }

            if (this.componentSelector.length > 0) {
                this.showComponentSelector = true;
            }
            else {
                this.showComponentSelector = false;
            }
        },
        setSelectedComponents: function(values) {
            var userSettings = {};
            var self = this;
            for (var k in this.registredComponents) {
                if (this.registredComponents[k].placeBeforeDatePicker === true) {
                    userSettings[k] = {"enabled": true};
                }
                else if (values.indexOf(k) === -1) {
                    userSettings[k] = {"enabled": false};
                    this.registredComponents[k].enabled = false;
                }
                else {
                    userSettings[k] = {"enabled": true, "order": values.indexOf(k)};
                    this.registredComponents[k].enabled = true;
                    this.registredComponents[k].order = values.indexOf(k);
                }
            }
            countlyGlobal.member.homeSettings = countlyGlobal.member.homeSettings || {};
            countlyGlobal.member.homeSettings[countlyCommon.ACTIVE_APP_ID] = userSettings;

            this.$store.dispatch('countlyHomeView/updateHomeView', userSettings).then(function() {
                if (self.$store.state.countlyHomeView.updateError) {
                    CountlyHelpers.notify({type: "error", title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["common.error"], sticky: false, clearAll: true});
                }
                else {
                    CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                }
            });

            this.calculatePlacedComponents();
        },
        selected: function(command) {
            if (command === "download") {
                var self = this;
                CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["home.download.starting"], sticky: true, clearAll: true});
                this.$store.dispatch("countlyHomeView/downloadScreen").then(function() {
                    if (self.$store.state.countlyHomeView.image) {
                        CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: "<a href='" + self.$store.state.countlyHomeView.image + "' target='_blank'>" + jQuery.i18n.map["common.download"] + "</a>", sticky: true, clearAll: true, html: true});
                    }
                    else {
                        CountlyHelpers.notify({type: "error", title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["common.error"], sticky: false, clearAll: true});
                    }
                });
            }
        }
    },
    computed: {

    }
};
</script>
