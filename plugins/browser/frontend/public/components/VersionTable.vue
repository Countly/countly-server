<template>
    <cly-section>
        <cly-datatable-n :rows="versionDetail" :resizable="true" :force-loading="isLoading">
            <template v-slot="scope">
                <el-table-column sortable="custom" prop="browser_version" :label="i18n('platforms.table.platform-version')"></el-table-column>
                <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')"></el-table-column>
                <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')"></el-table-column>
                <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')"></el-table-column>
            </template>
            <template v-slot:header-left>
                <el-select v-model="selectedBrowser">
                    <el-option :key="item.value" :value="item.value" :label="item.name" v-for="item in versions"></el-option>
                </el-select>
            </template>
        </cly-datatable-n>
    </cly-section>
</template>

<script>
import countlyVue from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    mixins: [
        countlyVue.mixins.i18n
    ],
    components: {
        ClySection,
        ClyDatatableN,
    },
    data: function() {
        return {
            versions: [],
            versionDetail: []
        };
    },
    computed: {
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.browserLoading;
        },
        appBrowser: function() {
            return this.$store.state.countlyDevicesAndTypes.appBrowser;
        },
        selectedBrowser: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', value);
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedBrowser;
            }
        }
    },
    watch: {
        selectedBrowser: function(newValue) {
            this.calculateVersions(newValue);
        },
        versions: function() {
            this.calculateVersionsDetail();
        }
    },
    methods: {
        calculateVersions: function(newValue) {
            if (newValue) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', newValue);
            }
            else {
                this.selectedBrowser = this.appBrowser.versions[0].label;
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedBrowser', this.selectedBrowser);
            }

            var tempVersions = [];
            for (var k = 0; k < this.appBrowser.versions.length; k++) {
                tempVersions.push({ "value": this.appBrowser.versions[k].label, "name": this.appBrowser.versions[k].label });
            }

            this.versions = tempVersions;
        },
        calculateVersionsDetail: function() {
            var versionDetail = [];

            for (var k = 0; k < this.appBrowser.versions.length; k++) {
                if (this.appBrowser.versions[k].label === this.selectedBrowser) {
                    versionDetail = this.appBrowser.versions[k].data || [];
                }
            }
            this.versionDetail = versionDetail;
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    mounted: function() {
        this.calculateVersions();
        this.calculateVersionsDetail();
    }
};
</script>