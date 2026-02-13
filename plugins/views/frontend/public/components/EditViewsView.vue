<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('views.table.edit-views')"
        >
            <template v-slot:header-top>
                <cly-back-link link="#/analytics/views" :title="i18n('views.back-to-views')"></cly-back-link>
            </template>
        </cly-header>
        <cly-main>
            <cly-confirm-dialog @cancel="closeDeleteForm" @confirm="submitDeleteForm" :before-close="closeDeleteForm" ref="deleteConfirmDialog" :visible.sync="showDeleteDialog" dialogType="danger" :saveButtonLabel="deleteDialogConfirmText" :cancelButtonLabel="i18n('common.no-dont-delete')" :title="deleteDialogTitle">
                <template slot-scope="scope">
                    {{deleteDialogText}}
                </template>
            </cly-confirm-dialog>
            <cly-section>
                <div class="bu-p-4">
                    <div class="text-smallish font-weight-bold bu-mb-2" data-test-id="manage-views-omit-title">{{i18n('data-manager.omit-segments')}}
                        <cly-tooltip-icon data-test-id="manage-views-omit-tooltip" class="bu-is-flex-grow-1 bu-ml-2" :tooltip="i18n('data-manager.omit-segments.tooltip')"></cly-tooltip-icon>
                    </div>
                    <cly-select-x
                        data-test-id="manage-views-omit-select"
                        mode="multi-check"
                        value=omitList
                        :collapseTags="false"
                        :options="availableSegments"
                        :show-search="true"
                        :searchable="true"
                        width="100%"
                        :placeholder="i18n('data-manager.omit-segments')"
                        v-model="omitList"
                        style="margin-top:2px; display:block;">
                    </cly-select-x>
                    <el-button class="bu-mt-2" v-if="canUserDelete" ref="omitSegmentsButton" type="success" @click="omitSegments">{{i18n('common.save')}}</el-button>
                </div>
            </cly-section>
            <cly-section>
                <cly-datatable-n :default-sort="{prop: 'view', order: 'ascending'}" :trackedFields="['display']" :data-source="remoteTableDataSource" ref="editViewsTable" @selection-change="handleSelectionChange">
                    <template v-slot:header-left>
                        <el-button v-if="!isDeleteButtonDisabled && canUserDelete" ref="deleteManyButton" :disabled="isDeleteButtonDisabled" type="danger" @click="deleteManyViews">{{i18n('common.delete')}}</el-button>
                    </template>
                    <template v-slot="scope">
                        <el-table-column width="65" type="selection"></el-table-column>
                        <el-table-column sortable="custom" prop="view" :label="i18n('views.table.view')"></el-table-column>
                        <el-table-column sortable="custom" prop="display" :label="i18n('views.display-name')">
                            <template v-slot="rowScope">
                                <el-input type="text" v-model="rowScope.row.editedDisplay" @input="function(e) {displayNameChanged(e,scope,rowScope);}"></el-input>
                            </template>
                        </el-table-column>
                    </template>
                    <template v-slot:bottomline="scope">
                        <cly-diff-helper :diff="scope.diff" @discard="scope.unpatch()" @save="updateManyViews" v-if="canUserUpdate"></cly-diff-helper>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import { i18n, i18nMixin, commonFormattersMixin, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { confirm as CountlyConfirm, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import jQuery from 'jquery';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyBackLink from '../../../../../frontend/express/public/javascripts/components/helpers/cly-back-link.vue';
import ClyConfirmDialog from '../../../../../frontend/express/public/javascripts/components/dialog/cly-confirm-dialog.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClyDiffHelper from '../../../../../frontend/express/public/javascripts/components/helpers/cly-diff-helper.vue';

var FEATURE_NAME = "views";

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyBackLink,
        ClyConfirmDialog,
        ClyTooltipIcon,
        ClySelectX,
        ClyDatatableN,
        ClyDiffHelper
    },
    mixins: [
        i18nMixin,
        commonFormattersMixin,
        authMixin(FEATURE_NAME),
    ],
    data: function() {
        return {
            description: i18n('views.title-desc'),
            remoteTableDataSource: getServerDataSource(this.$store, "countlyViews", "viewsEditTable"),
            isDeleteButtonDisabled: true,
            isUpdateButtonDisabled: true,
            selectedViews: [],
            deleteDialogTitle: i18n('views.delete-confirm-title'),
            deleteDialogText: "",
            deleteDialogConfirmText: i18n('views.yes-delete-view'),
            showDeleteDialog: false,
            availableSegments: ["platform"],
            omitList: [],
            segmentsLoaded: false,
        };
    },
    mounted: function() {
        var self = this;
        this.$store.dispatch('countlyViews/fetchMetaData').then(function() {
            var segments = self.$store.state.countlyViews.segments || {};
            self.availableSegments = [];
            for (var key in segments) {
                self.availableSegments.push({value: key, label: key});
            }
            var omittedSegments = self.$store.getters['countlyViews/getOmittedSegments'];
            self.omitList = omittedSegments || [];
            self.segmentsLoaded = true;
        });
    },
    methods: {
        handleSelectionChange: function(selectedRows) {
            if (selectedRows.length > 0) {
                this.isDeleteButtonDisabled = false;
                this.selectedViews = selectedRows;
            }
            else {
                this.isDeleteButtonDisabled = true;
            }
        },
        displayNameChanged: function(value, scope, rowscope) {
            var rows = this.$refs.editViewsTable.sourceRows;
            for (var k = 0; k < rows.length; k++) {
                if (rowscope.row._id === rows[k]._id) {
                    rows[k].editedDisplay = value; //have to change stored value
                    scope.patch(rowscope.row, {display: value});
                }
            }
        },
        omitSegments: function() {
            var self = this;
            CountlyConfirm(i18n('views.omit-segments-confirm'), "red", function(result) {
                if (!result) {
                    return true;
                }
                self.$store.dispatch("countlyViews/omitSegments", JSON.stringify(self.omitList)).then(function() {
                    if (self.$store.getters["countlyViews/updateError"]) {
                        notify({type: "error", title: jQuery.i18n.map["common.error"], message: self.$store.getters["countlyViews/updateError"], sticky: false, clearAll: true});
                    }
                    else {
                        notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                    }
                });
            });
        },
        deleteManyViews: function() {
            if (this.selectedViews.length > 0) {
                if (this.selectedViews.length === 1) {
                    this.deleteDialogTitle = i18n('views.delete-confirm-title');
                    this.deleteDialogText = i18n('views.delete-confirm').replace("{0}", this.selectedViews[0].display);
                    this.deleteDialogConfirmText = i18n('views.yes-delete-view');
                }
                else {
                    var names = [];
                    for (var k = 0; k < this.selectedViews.length; k++) {
                        names.push(this.selectedViews[k].display);
                    }
                    this.deleteDialogTitle = i18n('views.delete-many-confirm-title');
                    this.deleteDialogText = i18n('views.delete-confirm-many', names.join(", "));
                    this.deleteDialogConfirmText = i18n('views.yes-delete-many-view');
                }
                this.showDeleteDialog = true;
            }
        },
        submitDeleteForm: function() {
            var self = this;
            this.showDeleteDialog = false;

            if (this.selectedViews && this.selectedViews.length > 0) {
                var ids = [];
                for (var k = 0; k < this.selectedViews.length; k++) {
                    ids.push(this.selectedViews[k]._id);
                }
                this.$store.dispatch("countlyViews/deleteViews", ids.join(",")).then(function() {
                    if (self.$store.getters["countlyViews/updateError"]) {
                        notify({type: "error", title: jQuery.i18n.map["common.error"], message: self.$store.getters["countlyViews/updateError"], sticky: false, clearAll: true});
                    }
                    else {
                        notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                    }
                });
            }
        },
        closeDeleteForm: function() {
            this.showDeleteDialog = false;
        },
        updateManyViews: function() {
            var changes = [];
            var self = this;
            var rows = this.$refs.editViewsTable.sourceRows;
            for (var k = 0; k < rows.length; k++) {
                if (rows[k].editedDisplay !== rows[k].display) {
                    if (rows[k].editedDisplay === rows[k].view) {
                        changes.push({"key": rows[k]._id, "value": ""});
                    }
                    else {
                        changes.push({"key": rows[k]._id, "value": rows[k].editedDisplay});
                    }
                }
            }
            if (changes.length > 0) {
                this.$store.dispatch("countlyViews/updateViews", changes).then(function() {
                    if (self.$store.getters["countlyViews/updateError"]) {
                        notify({type: "error", title: jQuery.i18n.map["common.error"], message: self.$store.getters["countlyViews/updateError"], sticky: false, clearAll: true});
                    }
                    else {
                        notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                    }
                });
            }
        }
    }
};
</script>
