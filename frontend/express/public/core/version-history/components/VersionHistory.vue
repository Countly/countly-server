<template>
    <div v-bind:class="[componentId]" class="version-history-view">
        <cly-header>
            <template v-slot:header-left>
                <div class="header">
                    <div>{{ packageVersion }}</div>
                    <div>{{ mongoVersion }}</div>
                </div>
            </template>
        </cly-header>
        <cly-main>

            <cly-section>
                <cly-datatable-n :rows="versionHistoryViewDbRows" :resizable="true" >
                    <template v-slot:header-left="selectScope">
                        <p> {{ dbTitle }} </p>
                    </template>
                    <template v-slot="scope">
                        <el-table-column  column-key="version" prop="version" sortable="custom" :label="i18n('version_history.version')"></el-table-column>
                        <el-table-column  column-key="updated" prop="updated" sortable="custom" :label="i18n('version_history.upgraded')"></el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>

            <cly-section>
                <cly-datatable-n :rows="versionHistoryViewFsRows" :resizable="true" >
                    <template v-slot:header-left="selectScope">
                        <p> {{ fsTitle }} </p>
                    </template>
                    <template v-slot="scope">
                        <el-table-column column-key="version" prop="version" sortable="custom" :label="i18n('version_history.version')"></el-table-column>
                        <el-table-column column-key="updated" prop="updated" sortable="custom" :label="i18n('version_history.upgraded')"></el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>

        </cly-main>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyVersionHistoryManager from '../../../javascripts/countly/countly.version.history.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import jQuery from 'jquery';

// Component registration
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatatableN
    },
    mixins: [
        countlyVue.mixins.i18n
    ],
    data: function() {
        return {
            tableData: {
                db: [],
                fs: [],
                pkg: "",
                mongo: ""
            }
        };
    },
    mounted: function() {
        this.tableData = countlyVersionHistoryManager.getData(true) || this.tableData;
    },
    methods: {
        getTable: function(dataObj) {
            if (!Array.isArray(dataObj)) {
                dataObj = [];
            }
            if (dataObj.length === 0) {
                dataObj.push({"version": countlyGlobal.countlyVersion, "updated": new Date().toString()});
                dataObj[dataObj.length - 1].version += " " + jQuery.i18n.map["version_history.current-version"];
                dataObj[dataObj.length - 1].updated = new Date(dataObj[dataObj.length - 1].updated).toString();
            }
            else {
                dataObj[dataObj.length - 1].version = this.tableData.pkg + " " + jQuery.i18n.map["version_history.current-version"];
                for (var i = 0; i < dataObj.length; i++) {
                    dataObj[dataObj.length - (i + 1)].updated = new Date(dataObj[dataObj.length - (i + 1)].updated).toString();
                }
            }

            return dataObj;
        }
    },
    computed: {
        dbTitle: function() {
            return jQuery.i18n.map["version_history.page-title"] + " (DB)";
        },
        fsTitle: function() {
            return jQuery.i18n.map["version_history.page-title"] + " (FS)";
        },
        packageVersion: function() {
            return jQuery.i18n.map["version_history.package-version"] + ": " + this.tableData.pkg;
        },
        mongoVersion: function() {
            return "MongDb version: " + this.tableData.mongo;
        },
        versionHistoryViewDbRows: function() {
            return this.getTable(this.tableData.db);

        },
        versionHistoryViewFsRows: function() {
            return this.getTable(this.tableData.fs);
        }

    }
};
</script>