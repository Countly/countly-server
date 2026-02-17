<template>
    <cly-confirm-dialog
        @cancel="cancel"
        @confirm="submit"
        :visible.sync="isOpen"
        :show-close="false"
        :modal="false"
        :title="i18n('remote-config.parameter.conditions.add.new.condition')"
        width="674px"
        class="cly-vue-remote-config-condition-dialog"
        center
    >
        <template v-slot:title>
            <h3 class="color-cool-gray-100">{{ i18n('remote-config.parameter.conditions.add.new.condition') }}</h3>
        </template>
        <template slot-scope="scope">
            <cly-form>
                <template v-slot="formScope">
                    <cly-form-step id="conditions-dialog">
                        <div class="cly-vue-drawer-step__section">
                            <cly-form-field
                                v-slot="validation"
                                name="condition-name"
                                :subheading="i18n('placeholder.condition-name')"
                                :label="i18n('remote-config.condition-name')"
                                rules="required|regex:^[a-zA-Z0-9 ]+$"
                            >
                                <el-input
                                    v-model="conditionDialog.condition_name"
                                    :placeholder="i18n('remote-config.condition.name.placeholder')"
                                />
                                <div
                                    v-if="validation.errors.length > 0"
                                    class="text-small color-red-100 bu-pt-1"
                                >
                                    {{ i18n('remote-config.condition-key-error') }}
                                </div>
                            </cly-form-field>
                            <div class="bu-pt-3 bu-mt-2 bu-pb-1">
                                <el-checkbox
                                    class="text-smallish"
                                    v-bind:label="i18n('remote-config.use.description')"
                                    v-model="useDescription"
                                />
                                <div
                                    class="bu-pt-3 cly-vue-remote-config-conditions-drawer"
                                    v-if="useDescription"
                                >
                                    <cly-form-field
                                        name="description"
                                        :label="i18n('remote-config.conditions.description')"
                                        rules="required"
                                    >
                                        <textarea
                                            class="input"
                                            v-model="conditionDialog.condition_description"
                                            :placeholder="i18n('remote-config.conditions.description.placeholder')"
                                        />
                                    </cly-form-field>
                                </div>
                            </div>
                            <div class="bu-py-4">
                                <div class="text-big bu-mb-1">
                                    {{ i18n('remote-config.condition.color.tag') }}
                                </div>
                                <div class="bu-mb-3 color-cool-gray-50 text-small bu-mb-1">
                                    {{ i18n('remote-config.condition.color.tag.description') }}
                                </div>
                                <cly-color-tag
                                    :tags="colorTag"
                                    :defaultTag="defaultTag"
                                    v-model="selectedTag"
                                />
                            </div>
                            <div
                                v-if="showSeedValue"
                                class="bu-py-4"
                            >
                                <div class="font-weight-bold text-smallish bu-mb-1">
                                    {{ i18n('remote-config.seed') }}
                                </div>
                                <div class="color-cool-gray-50 text-small bu-mb-1">
                                    {{ i18n('remote-config.seed-value-description') }}
                                </div>
                                <el-input
                                    v-model="conditionDialog.seed_value"
                                    :placeholder="i18n('placeholder.seed-value')"
                                />
                            </div>
                            <div class="bu-pt-4">
                                <div class="font-weight-bold text-big bu-mb-1">
                                    {{ i18n('remote-config.condition-definition') }}
                                </div>
                                <div class="color-cool-gray-50 text-small bu-mb-1">
                                    {{ i18n('remote-config.condition-definition.description') }}
                                </div>
                                <div>
                                    <validation-provider
                                        name="condition-definition"
                                        rules="required"
                                        v-slot="v"
                                    >
                                        <cly-qb-segmentation
                                            ref="conditionQb"
                                            :class="{'is-error': v.errors.length > 0}"
                                            :additional-properties="additionalProperties"
                                            :additionalRules="remoteConfigFilterRules"
                                            :add-empty-row-on-empty-query="true"
                                            :allow-breakdown="false"
                                            :orGroupsEnabled="true"
                                            :modifyPropType="modifyPropType"
                                            show-in-the-last-minutes
                                            show-in-the-last-hours
                                            v-model="managedPropertySegmentation"
                                        />
                                    </validation-provider>
                                </div>
                            </div>
                        </div>
                    </cly-form-step>
                </template>
            </cly-form>
        </template>
    </cly-confirm-dialog>
</template>
<script>
import _ from 'underscore';
import { i18n, i18nMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';

export default {
    mixins: [
        mixins.MultiStepForm,
        i18nMixin
    ],
    data: function() {
        var additionalProperties = [];
        var remoteConfigFilterRules = [new window.countlyQueryBuilder.RowRule({
            name: "cly.remote-config-random-percentile-rule",
            selector: function(row) {
                return row.property.id === "up.random_percentile";
            },
            actions: [new window.countlyQueryBuilder.RowAction({
                id: "disallowOperator",
                params: {
                    selector: function(operator) {
                        return ["cly.=", "cly.!=", "cly.contains", "cly.between", "cly.isset", "cly.beginswith"].includes(operator.id);
                    }
                }
            })]
        })];
        additionalProperties.push(new window.countlyQueryBuilder.Property({
            id: 'up.random_percentile',
            name: i18n("remote-config.conditions.random.percentile"),
            type: window.countlyQueryBuilder.PropertyType.NUMBER,
            group: 'User Properties',
        }));
        return {
            selectedTag: {},
            conditionDialog: {
                condition_name: "",
                condition_color: 1,
                condition: {},
                condition_definition: "",
                seed_value: "",
                condition_description: ""
            },
            remoteConfigFilterRules: remoteConfigFilterRules,
            useDescription: false,
            managedPropertySegmentation: {},
            conditionPropertySegmentation: { query: {}, byVal: []},
            additionalProperties: additionalProperties,
            defaultTag: {
                value: 1,
                label: "#6C47FF"
            },
            colorTag: [
                { value: 1, label: "#6C47FF" },
                { value: 2, label: "#39C0C8" },
                { value: 3, label: "#F96300" },
                { value: 4, label: "#F34971" },
                { value: 5, label: "#F5C900" }
            ],
            modifyPropType: { 'up.av': window.countlyQueryBuilder.PropertyType.APP_VERSION_LIST },
        };
    },
    computed: {
        isOpen: function() {
            return this.$store.getters["countlyRemoteConfig/parameters/showConditionDialog"];
        },
        showSeedValue: function() {
            if (!_.isEmpty(this.managedPropertySegmentation.queryText) && this.$refs.conditionQb && this.$refs.conditionQb.meta.usedProps["up.random_percentile"]) {
                return true;
            }
            return false;
        }
    },
    props: {
        value: Object
    },
    methods: {
        submit: function() {
            var self = this;
            this.$emit("value", this.conditionDialog.condition_name);
            var action = "countlyRemoteConfig/conditions/create";
            this.conditionDialog.condition_color = this.selectedTag.value ? this.selectedTag.value : 1;
            if (!this.conditionDialog.condition_description || !this.useDescription) {
                this.conditionDialog.condition_description = "-";
            }
            if (!_.isEmpty(this.managedPropertySegmentation.query)) {
                this.conditionDialog.condition = this.managedPropertySegmentation.query;
            }
            if (this.managedPropertySegmentation.queryText) {
                this.conditionDialog.condition_definition = this.managedPropertySegmentation.queryText;
            }
            this.$store.dispatch(action, this.conditionDialog).then(function(data) {
                if (data) {
                    var ob = {
                        name: self.conditionDialog.condition_name,
                        id: data
                    };
                    self.$emit("input", ob);
                    self.$emit("closeConditionDialog");
                }
                else {
                    notify({
                        title: i18n("common.error"),
                        message: self.$store.getters["countlyRemoteConfig/conditions/conditionError"],
                        type: "error"
                    });
                }
            });
            this.$store.dispatch("countlyRemoteConfig/parameters/showConditionDialog", false);
        },
        cancel: function() {
            this.$store.dispatch("countlyRemoteConfig/parameters/showConditionDialog", false);
        },
    }
};
</script>
