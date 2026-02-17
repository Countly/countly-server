<template>
    <cly-drawer
        @submit="onSubmit"
        @copy="onCopy"
        @open="handleOpen"
        :title="title"
        ref="clyDrawer"
        :saveButtonLabel="saveButtonLabel"
        v-bind="controls"
    >
        <template v-slot:default="drawerScope">
            <cly-form-step id="parameters-drawer">
                <div class="cly-vue-drawer-step__section">
                    <cly-form-field
                        name="parameter-key"
                        v-slot="validation"
                        :label="i18n('remote-config.parameter-key')"
                        rules="required|regex:^[a-zA-Z_][a-zA-Z0-9_]*$"
                    >
                        <el-input
                            test-id="parameter-key-input"
                            v-model="drawerScope.editedObject.parameter_key"
                            maxlength="256"
                            :placeholder="i18n('remote-config.parameter-key.placeholder')"
                        >
                            <span
                                class="el-input__count"
                                slot="suffix"
                            >
                                <span class="el-input__count-inner">{{ drawerScope.editedObject.parameter_key.length }}/256</span>
                            </span>
                        </el-input>
                        <div
                            v-if="validation.errors.length > 0"
                            class="text-small color-red-100 bu-pt-1"
                        >
                            {{ i18n('remote-config.param-key-error') }}
                        </div>
                    </cly-form-field>
                    <div class="bu-pt-3 bu-mt-2 bu-pb-1">
                        <el-checkbox
                            test-id="parameter-description"
                            class="text-smallish"
                            v-bind:label="i18n('remote-config.use.description')"
                            v-model="showDescription"
                        />
                        <div
                            class="bu-pt-3 cly-vue-remote-config-conditions-drawer"
                            v-if="showDescription"
                        >
                            <cly-form-field
                                test-id="parameter-description"
                                name="description"
                                :label="i18n('remote-config.parameter.description')"
                                rules="required"
                            >
                                <textarea
                                    data-test-id="parameter-description-input"
                                    class="input"
                                    v-model="drawerScope.editedObject.description"
                                    :placeholder="i18n('remote-config.parameter.description.placeholder')"
                                />
                            </cly-form-field>
                        </div>
                    </div>
                    <div class="bu-py-1 cly-vue-remote-config-parameters-drawer__default-value">
                        <cly-form-field
                            name="default-value"
                            :label="i18n('remote-config.default-value')"
                            rules="required"
                        >
                            <el-autocomplete
                                class="cly-vue-remote-config-parameters-drawer__autocomplete"
                                v-model="defaultValue"
                                :fetch-suggestions="querySearch"
                                :placeholder="i18n('remote-config.default-value.placeholder')"
                                test-id="default-value-input"
                            >
                                <el-button
                                    type="text"
                                    slot="suffix"
                                    @click="openJsonEditor"
                                    class="cly-vue-remote-config-parameters-drawer__autocomplete-button"
                                >
                                    { }
                                </el-button>
                            </el-autocomplete>
                        </cly-form-field>
                    </div>
                    <json-editor
                        :isOpen="isOpen"
                        v-model="defaultValue"
                    />
                    <div
                        class="bu-py-4"
                        v-if="isDrillEnabled"
                    >
                        <div class="font-weight-bold text-big bu-mb-1">
                            {{ i18n('remote-config.conditions') }}
                        </div>
                        <div>
                            <draggable
                                :disabled="false"
                                handle=".drag-icon"
                                v-model="conditions"
                            >
                                <remote-config-add-condition
                                    ref="addCondition"
                                    v-for="(condition, i) in conditions"
                                    @remove-me="removeConditionAtIndex(i)"
                                    v-on:openJsonEditorForCondition="openJsonEditorForCondition(i)"
                                    :removable="conditions.length > 1"
                                    :key="i"
                                    :condition-index="i"
                                    :max-choices="10"
                                    v-model="conditions[i]"
                                />
                            </draggable>
                            <cly-select-x
                                test-id="add-value-for-condition"
                                ref="selectX"
                                @change="handleSelect"
                                v-model="currentConditionValue"
                                :options="conditionArray"
                                :width="450"
                                :show-search="true"
                                search-placeholder="Search in conditions"
                            >
                                <template v-slot:trigger>
                                    <el-button
                                        class="bg-light-blue-100 color-blue-100"
                                        size="small"
                                        type="text"
                                    >
                                        {{ i18n('remote-config.parameter.conditions.add.value') }}
                                    </el-button>
                                </template>
                                <template v-slot:action>
                                    <div class="bu-ml-3">
                                        <el-button
                                            data-test-id="new-condition-button"
                                            type="success"
                                            size="small"
                                            @click="showConditionDialog"
                                            icon="el-icon-circle-plus"
                                        >
                                            {{ i18n('remote-config.parameter.conditions.new.condition') }}
                                        </el-button>
                                    </div>
                                </template>
                            </cly-select-x>
                            <condition-dialog
                                v-on:closeConditionDialog="handleConditionDialog"
                                v-model="createdCondition"
                            />
                        </div>
                    </div>
                    <div class="bu-mt-4 cly-vue-drawer-step__section-group cly-vue-drawer-step__section-group--filled">
                        <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned">
                            <div>
                                <el-switch v-model="showExpirationDate" />
                                <span class="cly-vue-remote-config-conditions-drawer__letter-spacing font-weight-bold text-small bu-mb-1">
                                    {{ i18n('remote-config.expiration.time') }}
                                </span>
                            </div>
                            <div class="color-cool-gray-50 text-small bu-mb-1">
                                {{ i18n('remote-config.expiration.time.description') }}
                            </div>
                        </div>
                        <div v-if="showExpirationDate">
                            <validation-provider
                                v-slot="validation"
                                name="expiration"
                                ref="expirationValidator"
                                rules="required|oneDay"
                            >
                                <cly-date-picker
                                    class="bu-mt-5"
                                    v-model="drawerScope.editedObject.expiry_dttm"
                                    timestampFormat="ms"
                                    type="date"
                                    :isFuture="true"
                                    :selectTime="true"
                                />
                                <div
                                    v-if="validation.errors.length > 0"
                                    class="text-small color-red-100 bu-pt-1"
                                >
                                    {{ i18n('remote-config.expiration.time.error') }}
                                </div>
                            </validation-provider>
                        </div>
                    </div>
                </div>
            </cly-form-step>
        </template>
    </cly-drawer>
</template>
<script>
import moment from 'moment';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { i18n, i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import JsonEditor from './JsonEditor.vue';
import CreateConditionInput from './CreateConditionInput.vue';
import ConditionDialog from './ConditionDialog.vue';

export default {
    mixins: [commonFormattersMixin, i18nMixin],
    components: {
        "json-editor": JsonEditor,
        "remote-config-add-condition": CreateConditionInput,
        "condition-dialog": ConditionDialog
    },
    computed: {
        isOpen: function() {
            return this.$store.getters["countlyRemoteConfig/parameters/showJsonEditor"];
        },
        isDrillEnabled: function() {
            return countlyGlobal.plugins.indexOf("drill") > -1;
        },
        conditionArray: function() {
            var conditions = this.$store.getters["countlyRemoteConfig/conditions/all"];
            var ob = [];
            conditions.forEach(function(condition) {
                ob.push({
                    "label": condition.condition_name,
                    "value": {
                        "value": condition.condition_name,
                        "condition_id": condition._id
                    }
                });
            });
            return ob;
        }
    },
    props: {
        controls: {
            type: Object
        }
    },
    data: function() {
        return {
            title: "",
            saveButtonLabel: "",
            showDescription: false,
            valuesList: [],
            showExpirationDate: false,
            showCondition: false,
            countries: [{
                "label": "test",
                "value": "test"
            }],
            currentConditionValue: "",
            conditions: [],
            defaultValue: "",
            createdCondition: {}
        };
    },
    watch: {
        showExpirationDate: {
            immediate: true,
            handler: function(newValue) {
                if (this.$refs.clyDrawer) {
                    if (newValue === true) {
                        if (!this.$refs.clyDrawer.editedObject.expiry_dttm) {
                            var currentTime = moment();
                            this.$refs.clyDrawer.editedObject.expiry_dttm = currentTime.add(moment.duration(25, 'hours')).valueOf();
                        }
                    }
                    else if (newValue === false) {
                        this.$refs.clyDrawer.editedObject.expiry_dttm = null;
                    }
                }
            },
        },
    },
    methods: {
        handleOpen: function() {
            if (this.$refs.clyDrawer.editedObject.description) {
                this.$refs.clyDrawer.editedObject.description = this.unescapeHtml(this.$refs.clyDrawer.editedObject.description);
            }
            var self = this;
            setTimeout(function() {
                if (self.$refs.expirationValidator) {
                    self.$refs.expirationValidator.validate();
                }
            }, 300);
        },
        getOffset: function() {
            var activeAppId = countlyCommon.ACTIVE_APP_ID;
            var timeZone = countlyGlobal.apps[activeAppId].timezone ? countlyGlobal.apps[activeAppId].timezone : 'UTC';
            var utcDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'UTC' }));
            var tzDate = new Date(new Date().toLocaleString('en-US', { timeZone: timeZone }));
            return (tzDate.getTime() - utcDate.getTime()) / 6e4;
        },
        handleSelect: function(item) {
            this.showCondition = false;
            if (countlyGlobal.conditions_per_paramaeters === this.conditions.length) {
                notify({
                    title: i18n("common.error"),
                    message: i18n("remote-config.maximum_conditions_added"),
                    type: "error"
                });
            }
            else {
                var ob = {
                    name: item.value,
                    condition_id: item.condition_id,
                    open: false
                };
                this.conditions.push(ob);
                this.currentConditionValue = "";
            }
        },
        addNewCondition: function() {
            this.showCondition = true;
        },
        querySearch: function(queryString, cb) {
            var data = queryString ? this.valuesList.filter(this.createFilter(queryString)) : this.valuesList;
            var results = [];
            data.forEach(function(value) {
                var ob = {
                    value: value
                };
                results.push(ob);
            });
            return cb(results);
        },
        createFilter: function(queryString) {
            return function(value) {
                return typeof value === 'string' && value.toLowerCase().indexOf(queryString.toLowerCase()) === 0;
            };
        },
        querySearchForCondition: function(queryStringForCondition, cb) {
            var data = queryStringForCondition ? this.conditionArray.filter(this.createFilterForCondition(queryStringForCondition)) : this.conditionArray;
            var results = [];
            data.forEach(function(value) {
                var ob = {
                    value: value.condition_name,
                    condition_id: value._id
                };
                results.push(ob);
            });
            return cb(results);
        },
        createFilterForCondition: function(queryStringForCondition) {
            return function(value) {
                return value.condition_name.toLowerCase().indexOf(queryStringForCondition.toLowerCase()) === 0;
            };
        },
        onSubmit: function(doc) {
            if (doc.expiry_dttm && this.showExpirationDate) {
                doc.expiry_dttm = doc.expiry_dttm + new Date().getTimezoneOffset() * 60 * 1000;
            }
            if (!this.showExpirationDate) {
                doc.expiry_dttm = null;
            }
            var self = this;
            doc.conditions = [];
            doc.default_value = this.defaultValue;
            var action = "countlyRemoteConfig/parameters/create";
            if (doc._id) {
                action = "countlyRemoteConfig/parameters/update";
            }
            if (!doc.description || !this.showDescription) {
                doc.description = "-";
            }
            if (doc.status === "Expired" && doc.expiry_dttm > Date.now()) {
                doc.status = "Running";
            }
            if (this.conditions) {
                this.conditions.forEach(function(condition, idx) {
                    var ob = {
                        condition_id: self.conditions[idx].condition_id,
                        value: self.conditions[idx].value
                    };
                    doc.conditions.push(ob);
                });
            }
            this.$store.dispatch(action, doc)
                .then(function() {
                    if (!doc._id) {
                        notify({
                            title: 'Success',
                            message: i18n('remote-config.parameter.create.success'),
                            type: 'success'
                        });
                    }
                    else {
                        notify({
                            title: 'Success',
                            message: i18n('remote-config.parameter.edit.success'),
                            type: 'success'
                        });
                    }
                    self.$emit("submit");
                })
                .catch(function() {
                    if (!doc._id) {
                        notify({
                            message: i18n('remote-config.parameter.create.fail'),
                            type: 'error',
                            width: 'large',
                        });
                    }
                    else {
                        notify({
                            message: i18n('remote-config.parameter.edit.fail'),
                            type: 'error',
                            width: 'large',
                        });
                    }
                });
        },
        onCopy: function(doc) {
            if (doc._id) {
                if (doc.expiry_dttm) {
                    doc.expiry_dttm = doc.expiry_dttm - new Date().getTimezoneOffset() * 60 * 1000;
                }
                this.showExpirationDate = false;
                this.defaultValue = doc.default_value + '';
                if (doc.description === "-") {
                    doc.description = "";
                }
                if (typeof (doc.default_value) === 'object') {
                    this.defaultValue = JSON.stringify(doc.default_value);
                }
                this.title = "Update parameter";
                this.saveButtonLabel = "Save";
                if (doc.description) {
                    this.showDescription = true;
                }
                if (doc.valuesList) {
                    this.valuesList = doc.valuesList;
                }
                if (doc.expiry_dttm) {
                    this.showExpirationDate = true;
                }
                if (doc.conditions) {
                    var allConditions = this.$store.getters["countlyRemoteConfig/conditions/all"];
                    doc.conditions.forEach(function(item) {
                        item.open = false;
                        if (typeof (item.value) === 'object') {
                            item.value = JSON.stringify(item.value);
                        }
                        var conditionsArr = allConditions.filter(function(ob) {
                            return ob._id === item.condition_id;
                        });
                        if (conditionsArr.length > 0) {
                            item.name = conditionsArr[0].condition_name;
                        }
                    });
                    this.conditions = doc.conditions;
                }
            }
            else {
                this.conditions = [];
                this.title = "Add parameter";
                this.saveButtonLabel = "Save";
                this.showDescription = false;
                this.valuesList = [];
                this.showExpirationDate = false;
                this.defaultValue = "";
            }
        },
        openJsonEditor: function() {
            this.$store.dispatch("countlyRemoteConfig/parameters/showJsonEditor", true);
        },
        removeConditionAtIndex: function(index) {
            this.$delete(this.conditions, index);
        },
        showConditionDialog: function() {
            this.$refs.selectX.doClose();
            this.$store.dispatch("countlyRemoteConfig/parameters/showConditionDialog", true);
        },
        handleConditionDialog: function() {
            this.showCondition = false;
            var ob = {
                name: this.createdCondition.name,
                condition_id: this.createdCondition.id,
                open: false
            };
            this.conditions.push(ob);
        }
    }
};
</script>
