<template>
<cly-drawer
    ref="populatorDrawer"
    @submit="onSubmit"
    class="populator-template"
    v-bind="$props.controls"
    :hasBackLink="{ value: true, style: 'width: 630px' }"
    name="populatorTemplate"
    :title="$props.titleDescription.header"
    :saveButtonLabel="$props.titleDescription.button"
    toggle-transition="stdt-fade"
    test-id="populator-template-form"
    :size="12">
    <template v-slot:default="drawerScope">
        <cly-form-step id="create-template-step">
            <div class="bu-is-flex bu-is-justify-content-space-around">
                <div class="populator-template__left-container">
                    <div class="wrapper">
                        <cly-populator-left-container :data="items"></cly-populator-left-container>
                    </div>
                </div>
                <div style="width: 702px">
                    <div class="cly-vue-drawer-step__section">
                        <div class="text-button font-weight-bold bu-mb-2">{{ i18n('populator.template-name') }}</div>
                        <validation-provider name="key" rules="required" v-slot="v">
                            <el-input class="bu-is-shadowless" style="margin-bottom: 20px" :class="{'is-error': v.errors.length > 0}" :placeholder="i18n('populator.template-name-placeholder')" v-model="drawerScope.editedObject.name"></el-input>
                        </validation-provider>
                    </div>
                    <div class="cly-vue-drawer-step__section" id="section-0">
                        <cly-populator-section title="Users" type="userSection" v-model="drawerScope.editedObject.users" :parent-data="drawerScope.editedObject.behavior">
                            <template v-slot:default>
                                <span class="text-medium bu-has-text-weight-medium">{{i18n("populator-template.unique-users")}}</span>
                                <cly-tooltip-icon :tooltip="i18n('populator-template.unique-users-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                                <cly-populator-number-selector class="bu-mb-5 bu-mt-3" :items="uniqueUserItems" v-model="drawerScope.editedObject.uniqueUserCount"></cly-populator-number-selector>
                                <span class="text-medium bu-has-text-weight-medium">{{i18n("populator-template.platforms")}}</span>
                                <cly-tooltip-icon :tooltip="i18n('populator-template.platforms-tooltip')" icon="ion ion-help-circled"></cly-tooltip-icon>
                                <validation-provider name="platform" rules="required" v-slot="v">
                                    <div class="bu-mt-1 populator-template__users--platform-type">
                                        <el-checkbox-group v-model="drawerScope.editedObject.platformType" size="medium" :class="{'is-error': v.errors.length > 0}">
                                            <el-checkbox label="Mobile" border></el-checkbox>
                                            <el-checkbox label="Web" border></el-checkbox>
                                            <el-checkbox label="Desktop" border></el-checkbox>
                                        </el-checkbox-group>
                                    </div>
                                </validation-provider>
                            </template>
                        </cly-populator-section>
                    </div>
                    <div class="cly-vue-drawer-step__section" id="section-1">
                        <cly-populator-section title="Events" type="eventsSection" v-model="drawerScope.editedObject.events" hasSwitch :parent-data="drawerScope.editedObject.sequences" @section-activity-change="(val) => sectionActivityChange(val, 'events')" :section-activity="sectionActivity"></cly-populator-section>
                    </div>
                    <div class="cly-vue-drawer-step__section" id="section-2">
                        <cly-populator-section title="Views" type="viewsSection" v-model="drawerScope.editedObject.views" hasSwitch :parent-data="drawerScope.editedObject.sequences" @section-activity-change="(val) => sectionActivityChange(val, 'views')" :section-activity="sectionActivity"></cly-populator-section>
                    </div>
                    <div class="cly-vue-drawer-step__section" id="section-3">
                        <cly-populator-section title="Sequences" type="sequencesSection" @deleted-index="onSequenceDeleted" :parent-data="prepareData('sequences', drawerScope.editedObject.events, drawerScope.editedObject.views, drawerScope.editedObject.behavior)" v-model="drawerScope.editedObject.sequences" hasSwitch @section-activity-change="(val) => sectionActivityChange(val, 'sequences')" :section-activity="sectionActivity"></cly-populator-section>
                    </div>
                    <div class="cly-vue-drawer-step__section" id="section-4">
                        <cly-populator-section title="Behavior" type="behaviorSection" :deleted-index="deletedIndex" :parent-data="prepareData('behavior', drawerScope.editedObject.users, drawerScope.editedObject.sequences)" v-model="drawerScope.editedObject.behavior" :section-activity="sectionActivity.sequences"></cly-populator-section>
                    </div>
                </div>
                <div></div>
            </div>
        </cly-form-step>
    </template>
</cly-drawer>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import countlyPopulator from '../store/index.js';
import Vue from 'vue';
import ClyDrawer from '../../../../../frontend/express/public/javascripts/components/drawer/cly-drawer.vue';
import ClyFormStep from '../../../../../frontend/express/public/javascripts/components/form/cly-form-step.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';

export default {
    mixins: [i18nMixin],
    props: {
        controls: {type: Object, default: function() { return {}; }},
        titleDescription: {type: Object, default: function() { return {}; }}
    },
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            items: [
                {header: i18n('populator-template.users'), isActive: true},
                {header: i18n('populator-template.events'), isActive: false},
                {header: i18n('populator-template.views'), isActive: false},
                {header: i18n('populator-template.sequences'), isActive: false},
                {header: i18n('populator-template.behavior'), isActive: false },
            ],
            users: [],
            events: [],
            uniqueUserItems: [
                {value: 100, text: 100},
                {value: 500, text: 500},
                {value: 1000, text: 1000}
            ],
            deletedIndex: null,
            sectionActivity: {}
        };
    },
    methods: {
        onSequenceDeleted: function(index) {
            this.deletedIndex = index + "_" + Date.now();
        },
        checkInputProbabilities: function(editedObject) {
            let warningMessage = "";
            let sectionsToVerify = ["users", "views", "events", "behavior"];
            sectionsToVerify.forEach(function(sectionName) {
                if (Array.isArray(editedObject[sectionName])) {
                    editedObject[sectionName].forEach(item => {
                        let sectionTotal = null;
                        let conditionTotal = null;
                        let conditionValueText = null;
                        if (item.segmentations) {
                            item.segmentations.forEach(segmentation => {
                                sectionTotal = 0;
                                if (segmentation.values) {
                                    segmentation.values.forEach(value => {
                                        sectionTotal += parseInt(value.probability, 10) || 0;
                                    });
                                }
                                if (segmentation.conditions && segmentation.conditions.length) {
                                    segmentation.conditions.forEach(condition => {
                                        conditionTotal = 0;
                                        conditionValueText = "If(" + condition.selectedKey + ")" + (condition.conditionType === 1 ? " = " : " ≠") + condition.selectedValue;
                                        condition.values.forEach(conditionValue => {
                                            conditionTotal += parseInt(conditionValue.probability, 10) || 0;
                                        });
                                        if (conditionTotal && conditionTotal !== 100) {
                                            warningMessage += i18n('populator-template.warning-probability-validation-events-condition', sectionName, conditionValueText, segmentation.key) + "<br/></br>";
                                        }
                                    });
                                }
                                if (sectionTotal && sectionTotal !== 100) {
                                    warningMessage += i18n('populator-template.warning-probability-validation-events', sectionName, segmentation.key) + "<br/></br>";
                                }
                            });
                        }
                        else if (item.values) {
                            item.values.forEach(value => {
                                sectionTotal += parseInt(value.probability, 10) || 0;
                            });
                            if (item.conditions && item.conditions.length) {
                                item.conditions.forEach(condition => {
                                    conditionTotal = 0;
                                    conditionValueText = "If(" + condition.selectedKey + ")" + (condition.conditionType === 1 ? " = " : " ≠") + condition.selectedValue;
                                    condition.values.forEach(conditionValue => {
                                        conditionTotal += parseInt(conditionValue.probability, 10) || 0;
                                    });
                                    if (conditionTotal !== 0 && conditionTotal && conditionTotal !== 100) {
                                        warningMessage += i18n('populator-template.warning-probability-validation-users-condition', conditionValueText, item.key) + "<br/></br>";
                                    }
                                });
                            }
                            if (sectionTotal && sectionTotal !== 100) {
                                warningMessage += i18n('populator-template.warning-probability-validation-users', item.key) + "<br/></br>";
                            }
                        }
                    });
                }
                else if (typeof editedObject[sectionName] === 'object') {
                    let sectionTotal = null;
                    let conditionValueText = null;
                    if (editedObject[sectionName].sequences) {
                        sectionTotal = 0;
                        editedObject[sectionName].sequences.forEach(sequence => {
                            sectionTotal += parseInt(sequence.probability, 10) || 0;
                        });
                        if (sectionTotal && sectionTotal !== 100) {
                            warningMessage += i18n('populator-template.warning-probability-validation-behavior') + "<br/></br>";
                        }
                    }
                    if (editedObject[sectionName].sequenceConditions && editedObject[sectionName].sequenceConditions.length) {
                        let conditionTotal = null;
                        editedObject[sectionName].sequenceConditions.forEach(condition => {
                            conditionTotal = 0;
                            conditionValueText = "If(" + condition.selectedKey + ")" + (condition.conditionType === 1 ? " = " : " ≠") + condition.selectedValue;
                            condition.values.forEach(conditionValue => {
                                conditionTotal += parseInt(conditionValue.probability, 10) || 0;
                            });
                            if (conditionTotal && conditionTotal !== 100) {
                                warningMessage += i18n('populator-template.warning-probability-validation-behavior-condition', conditionValueText) + "<br/></br>";
                            }
                        });
                    }
                }
            });
            return warningMessage;
        },
        checkDuplicatedValues: function(editedObject) {
            let warningMessage = "";
            let sectionsToVerify = ["users", "views", "events"];

            const checkIfDuplicated = (values, sectionName, isKeyChecking) => {
                let keys = [];
                if (values && values.length) {
                    values.forEach(val => {
                        const key = val.key;
                        if (keys.includes(key)) {
                            warningMessage += i18n('populator-template.warning-duplicate-' + (isKeyChecking === true ? "name" : "value"), key.length ? key : "Empty/Unset", sectionName) + "<br/></br>";
                        }
                        else {
                            keys.push(key);
                        }
                    });
                }
            };

            sectionsToVerify.forEach(sectionName => {
                checkIfDuplicated(editedObject[sectionName], sectionName, true);
                editedObject[sectionName].forEach(item => {
                    if (item.segmentations) {
                        checkIfDuplicated(item.segmentations, sectionName, true);
                        item.segmentations.forEach(segmentation => {
                            checkIfDuplicated(item.segmentation, true);
                            if (segmentation.values) {
                                checkIfDuplicated(segmentation.values, sectionName);
                            }
                            if (segmentation.conditions && segmentation.conditions.length) {
                                segmentation.conditions.forEach(condition => {
                                    checkIfDuplicated(condition.values, sectionName);
                                });
                            }
                        });
                    }
                    else if (item.values) {
                        checkIfDuplicated(item.values, sectionName);
                        if (item.conditions && item.conditions.length) {
                            item.conditions.forEach(condition => {
                                checkIfDuplicated(condition.values, sectionName);
                            });
                        }
                    }
                });
            });
            return warningMessage;
        },
        onSubmit: function(editedObject) {
            var self = this;
            const isEdit = !!editedObject._id;
            const isDuplicate = editedObject.is_duplicate;
            const validationMessages = this.checkInputProbabilities(editedObject);
            if (validationMessages && validationMessages.length) {
                notify({type: "error", title: i18n("common.error"), message: validationMessages, sticky: true, clearAll: true});
                this.$refs.populatorDrawer.disableAutoClose = true;
                return;
            }
            const duplicatedValues = this.checkDuplicatedValues(editedObject);
            if (duplicatedValues && duplicatedValues.length) {
                notify({type: "error", title: i18n("common.error"), message: duplicatedValues, sticky: true, clearAll: true});
                this.$refs.populatorDrawer.disableAutoClose = true;
                return;
            }
            if (isEdit && !isDuplicate) {
                countlyPopulator.editTemplate(editedObject._id, editedObject, function(res) {
                    if (res && res.result) {
                        notify({type: "ok", title: i18n("common.success"), message: i18n("populator-success-edit-template"), sticky: false, clearAll: true});
                        self.$emit('refresh-table', true, true);
                    }
                    else if (res && res.err) {
                        notify({type: "error", title: i18n("common.error"), message: res.err, sticky: true, clearAll: true});
                    }
                });
            }
            else {
                countlyPopulator.createTemplate(editedObject, function(res) {
                    if (res && res.result) {
                        notify({type: "ok", title: i18n("common.success"), message: i18n("populator-success-create-template"), sticky: false, clearAll: true});
                        self.$emit('refresh-table', true, true);
                    }
                    else if (res && res.err) {
                        notify({type: "error", title: i18n("common.error"), message: res.err, sticky: true, clearAll: true});
                    }
                });
            }
            this.$refs.populatorDrawer.disableAutoClose = false;
        },
        prepareData: function(type, data1, data2, data3) {
            if (type === 'behavior') {
                const users = data1;
                const sequences = data2;
                const preparedData = {users: []};
                if (users && users.length) {
                    users.forEach(function(item) {
                        preparedData.users.push({keys: item.key, values: item.values});
                    });
                }
                if (sequences && sequences.length) {
                    if (!preparedData.sequences) {
                        preparedData.sequences = [];
                    }
                    preparedData.sequences = sequences;
                }
                return preparedData;
            }
            else if (type === "sequences") {
                const events = data1;
                const views = data2;
                const preparedData = {events: [], views: [], behavior: {}};
                if (events && events.length) {
                    events.forEach(function(item) {
                        preparedData.events.push({name: item.key, value: item.key.toLowerCase()});
                    });
                }
                if (views && views.length) {
                    views.forEach(function(item) {
                        preparedData.views.push({name: item.key, value: item.key.toLowerCase()});
                    });
                }
                preparedData.behavior = data3;
                return preparedData;
            }
        },
        sectionActivityChange: function(value, section) {
            if (!this.sectionActivity[section]) {
                Vue.set(this.sectionActivity, section, false);
            }
            Vue.set(this.sectionActivity, section, value);
        }
    },
    components: {
        ClyDrawer,
        ClyFormStep,
        ClyTooltipIcon
    }
};
</script>
