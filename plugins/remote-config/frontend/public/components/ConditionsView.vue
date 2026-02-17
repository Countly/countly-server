<template>
    <div>
        <cly-header :title="i18n('remote-config.title')">
            <template v-slot:header-right>
                <div
                    class="bu-level-item"
                    v-if="hasCreateRight"
                >
                    <el-button
                        data-test-id="add-condition-button"
                        @click="create"
                        type="success"
                        size="small"
                        icon="el-icon-circle-plus"
                    >
                        Add Condition
                    </el-button>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <cly-datatable-n
                test-id="condition"
                :rows="tableRows"
                :force-loading="isTableLoading"
                class="cly-vue-remote-config-conditions-table"
                :row-class-name="tableRowClassName"
            >
                <template v-slot="scope">
                    <el-table-column
                        prop="condition_name"
                        :label="i18n('remote-config.condition-name')"
                        sortable="custom"
                    >
                        <template v-slot="rowScope">
                            <div>
                                <div
                                    :data-test-id="'datatable-condition-name-' + rowScope.$index"
                                    class="cly-vue-remote-config-conditions-drawer__margin-bottom"
                                >
                                    {{ rowScope.row.condition_name }}
                                </div>
                                <div
                                    :data-test-id="'datatable-condition-parameter-affect-' + rowScope.$index"
                                    class="color-cool-gray-40 text-small"
                                >
                                    {{ rowScope.row.used_in_parameters }} {{ i18n('remote-config.conditions.parameter.affected') }}
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        test-id="condition"
                        prop="condition_description"
                        :label="i18n('remote-config.description')"
                    >
                        <template v-slot:default="rowScope">
                            <div :data-test-id="'datatable-condition-description-' + rowScope.$index">
                                {{ displayDescription(rowScope.row.condition_description) }}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        test-id="condition"
                        prop="condition_definition"
                        :label="i18n('remote-config.definition')"
                    >
                        <template v-slot:default="rowScope">
                            <div
                                :data-test-id="'datatable-condition-description-' + rowScope.$index"
                                v-html="rowScope.row.condition_definition"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column
                        test-id="condition"
                        prop="seed_value"
                        :label="i18n('remote-config.seed-value')"
                    >
                        <template v-slot:default="rowScope">
                            <div :data-test-id="'datatable-condition-seed-value-' + rowScope.$index">
                                {{ rowScope.row.seed_value || "Default" }}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        type="options"
                        v-if="hasUpdateRight || hasDeleteRight"
                    >
                        <template v-slot="rowScope">
                            <cly-more-options
                                :test-id="'more-option-button-' + rowScope.$index"
                                v-if="rowScope.row.hover"
                                size="small"
                                @command="handleCommand($event, scope, rowScope.row)"
                            >
                                <el-dropdown-item
                                    v-if="hasUpdateRight"
                                    command="edit"
                                    data-test-id="condition-data-table-more-option-edit-button"
                                >
                                    {{ i18n('common.edit') }}
                                </el-dropdown-item>
                                <el-dropdown-item
                                    v-if="hasDeleteRight"
                                    command="remove"
                                    data-test-id="condition-data-table-more-option-delete-button"
                                >
                                    {{ i18n('common.delete') }}
                                </el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-main>
        <drawer
            :controls="drawers.conditions"
            @submit="onSubmit"
        />
    </div>
</template>
<script>
import { i18nMixin, commonFormattersMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { confirm as CountlyConfirm } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { validateCreate, validateUpdate, validateDelete } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { factory } from '../store/index.js';
import ConditionsDrawer from './ConditionsDrawer.vue';

var FEATURE_NAME = "remote_config";

export default {
    mixins: [
        mixins.hasDrawers("conditions"),
        commonFormattersMixin,
        i18nMixin
    ],
    components: {
        drawer: ConditionsDrawer
    },
    computed: {
        tableRows: function() {
            return this.$store.getters["countlyRemoteConfig/conditions/all"];
        },
        hasUpdateRight: function() {
            return validateUpdate(FEATURE_NAME);
        },
        hasCreateRight: function() {
            return validateCreate(FEATURE_NAME);
        },
        hasDeleteRight: function() {
            return validateDelete(FEATURE_NAME);
        },
        isTableLoading: function() {
            return this.$store.getters["countlyRemoteConfig/conditions/isTableLoading"];
        }
    },
    methods: {
        displayDescription: function(description) {
            if (description && description.length) {
                return this.unescapeHtml(description);
            }
            return '-';
        },
        create: function() {
            this.openDrawer("conditions", factory.conditions.getEmpty());
        },
        handleCommand: function(command, scope, row) {
            var self = this;
            switch (command) {
            case "edit":
                self.openDrawer("conditions", row);
                break;
            case "remove":
                CountlyConfirm(this.i18n("remote-config.confirm-condition-delete", "<b>" + row.condition_name + "</b>"), "popStyleGreen", function(result) {
                    if (!result) {
                        return false;
                    }
                    self.$store.dispatch("countlyRemoteConfig/conditions/remove", row).then(function() {
                        self.onSubmit();
                    });
                }, [this.i18n("common.no-dont-delete"), this.i18n("remote-config.yes-delete-condition")], {title: this.i18n("remote-config.delete-condition-title"), image: "delete-email-report"});
                break;
            }
        },
        onSubmit: function() {
            this.$store.dispatch("countlyRemoteConfig/initialize");
        },
        tableRowClassName: function(obj) {
            if (obj.row.condition_color === 1) {
                return 'remote-config-purple';
            }
            else if (obj.row.condition_color === 2) {
                return 'remote-config-teal';
            }
            else if (obj.row.condition_color === 3) {
                return 'remote-config-orange';
            }
            else if (obj.row.condition_color === 4) {
                return 'remote-config-magenta';
            }
            else {
                return 'remote-config-amber';
            }
        }
    }
};
</script>
