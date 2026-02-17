<template>
    <cly-drawer
        @submit="onSubmit"
        @copy="onCopy"
        @open="handleOpen"
        :title="title"
        ref="clyDrawer"
        :saveButtonLabel="saveButtonLabel"
        v-bind="controls"
        test-id="condition-drawer"
    >
        <template v-slot:default="drawerScope">
            <cly-form-step id="conditions-drawer">
                <div class="cly-vue-drawer-step__section">
                    <cly-form-field
                        name="condition-name"
                        test-id="condition-drawer-name-label"
                        v-slot="validation"
                        :subheading="i18n('placeholder.condition-name')"
                        :label="i18n('remote-config.condition-name')"
                        rules="required|regex:^[a-zA-Z0-9 ]+$"
                    >
                        <el-input
                            test-id="condition-drawer-name-input"
                            v-model="drawerScope.editedObject.condition_name"
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
                            test-id="condition-drawer-use-desc-checkbox"
                            class="text-smallish"
                            v-bind:label="i18n('remote-config.use.description')"
                            v-model="useDescription"
                        />
                        <div
                            class="bu-pt-3 cly-vue-remote-config-conditions-drawer"
                            v-if="useDescription"
                        >
                            <cly-form-field
                                test-id="condition-drawer-description-label"
                                name="description"
                                :label="i18n('remote-config.conditions.description')"
                                rules="required"
                            >
                                <textarea
                                    data-test-id="condition-drawer-description-input"
                                    class="input"
                                    v-model="drawerScope.editedObject.condition_description"
                                    :placeholder="i18n('remote-config.conditions.description.placeholder')"
                                />
                            </cly-form-field>
                        </div>
                    </div>
                    <div class="bu-py-4">
                        <div
                            data-test-id="condition-drawer-color-tag-label"
                            class="text-big font-weight-bold bu-mb-1"
                        >
                            {{ i18n('remote-config.condition.color.tag') }}
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
                            v-model="drawerScope.editedObject.seed_value"
                            :placeholder="i18n('placeholder.seed-value')"
                        />
                    </div>
                    <div class="bu-pt-4">
                        <div
                            data-test-id="condition-drawer-condition-definition-label"
                            class="font-weight-bold text-big bu-mb-1"
                        >
                            {{ i18n('remote-config.condition-definition') }}
                        </div>
                        <div>
                            <validation-provider
                                name="condition-definition"
                                rules="required"
                                v-slot="v"
                            >
                                <cly-qb-segmentation
                                    test-id="condition-drawer"
                                    ref="qb"
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
    </cly-drawer>
</template>
<script>
import _ from 'underscore';
import { i18n, i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [commonFormattersMixin, i18nMixin],
    props: {
        controls: {
            type: Object
        }
    },
    computed: {
        showSeedValue: function() {
            if (!_.isEmpty(this.managedPropertySegmentation.queryText) && this.$refs.qb && this.$refs.qb.meta.usedProps["up.random_percentile"]) {
                return true;
            }
            return false;
        }
    },
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
                        return ["cly.=", "cly.!=", "cly.contains", "cly.between", "cly.isset"].includes(operator.id);
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
            remoteConfigFilterRules: remoteConfigFilterRules,
            selectedTag: {},
            useDescription: false,
            managedPropertySegmentation: {},
            conditionPropertySegmentation: { query: {}, byVal: []},
            additionalProperties: additionalProperties,
            title: "",
            saveButtonLabel: "",
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
    methods: {
        handleOpen: function() {
            if (this.$refs.clyDrawer.editedObject.condition_description) {
                this.$refs.clyDrawer.editedObject.condition_description = this.unescapeHtml(this.$refs.clyDrawer.editedObject.condition_description);
            }
        },
        onSubmit: function(doc) {
            var self = this;
            doc.condition_color = this.selectedTag.value ? this.selectedTag.value : 1;
            if (!doc.condition_description || !self.useDescription) {
                doc.condition_description = "-";
            }
            if (!_.isEmpty(self.managedPropertySegmentation.query)) {
                doc.condition = self.managedPropertySegmentation.query;
            }
            if (self.managedPropertySegmentation.queryText) {
                doc.condition_definition = self.managedPropertySegmentation.queryText;
            }
            var action = "countlyRemoteConfig/conditions/create";
            if (doc._id) {
                action = "countlyRemoteConfig/conditions/update";
            }
            this.$store.dispatch(action, doc)
                .then(function() {
                    self.$emit("submit");
                });
        },
        onCopy: function(doc) {
            if (doc._id) {
                if (doc.condition_color) {
                    var arr = this.colorTag.filter(function(item) {
                        return item.value === doc.condition_color;
                    });
                    if (arr.length > 0) {
                        this.defaultTag = arr[0];
                    }
                    else {
                        this.defaultTag = {
                            value: 1,
                            label: "#6C47FF"
                        };
                    }
                }
                if (doc.condition_description === "-") {
                    doc.condition_description = "";
                }
                this.title = "Update condition";
                this.saveButtonLabel = "Save";
                if (!_.isEmpty(doc.condition)) {
                    this.managedPropertySegmentation.query = JSON.parse(doc.condition);
                }
                if (doc.condition_definition) {
                    this.managedPropertySegmentation.queryText = doc.condition_definition;
                }
                if (doc.condition_description) {
                    this.useDescription = true;
                }
            }
            else {
                this.title = "Add condition";
                this.saveButtonLabel = "Save";
                this.managedPropertySegmentation.query = {};
                this.managedPropertySegmentation.queryText = "";
                this.useDescription = false;
                this.selectedTag = {};
                this.defaultTag = {
                    value: 1,
                    label: "#6C47FF"
                };
            }
        }
    }
};
</script>
