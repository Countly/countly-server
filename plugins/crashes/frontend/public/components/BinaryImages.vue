<template>
    <div>
        <cly-header>
            <template v-slot:header-top>
                <cly-back-link></cly-back-link>
            </template>
            <template v-slot:header-left>
                <div class="bu-is-flex bu-is-flex-direction-column">
                    <div class="bu-is-flex bu-is-align-items-center">
                        <h2 class="bu-mr-2">Binary Images</h2>
                        <cly-guide></cly-guide>
                    </div>
                    <div class="text-big font-weight-bold bu-mt-4" v-html="crash.name"></div>
                    <div class="bu-mt-2">
                        <span class="text-small bu-mr-4" v-if="'app_build' in crash">
                            App Build Number: {{crash.app_build}}
                        </span>
                        <span class="text-small bu-mr-4" v-if="'app_version' in crash">
                            App Version: {{crash.app_version}}
                        </span>
                        <span class="text-small" v-if="'os_version' in crash">
                            Platform Version: {{crash.os_version}}
                        </span>
                    </div>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <cly-datatable-n :rows="binaryImages" ref="tableData">
                <template v-slot="scope">
                    <el-table-column prop="name" width="210" sortable></el-table-column>
                    <el-table-column prop="uuid" label="Build UUID" width="400"></el-table-column>
                    <el-table-column prop="loadAddress" label="Load Address"></el-table-column>
                    <el-table-column width="120" fixed="right" v-if="symbolicationEnabled">
                        <template slot-scope="col">
                            <el-button type="text" @click="openDrawer('crashSymbol', { build: col.row.uuid, platform: crash.os })" v-if="!hasSymbol(col.row.uuid)">Add Symbol</el-button>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-main>
        <component :is="drawerComponent" @symbols-changed="refresh" ref="crashSymbolDrawer" :controls="drawers.crashSymbol" v-if="symbolicationEnabled && drawerComponent"></component>
    </div>
</template>

<script>
import { mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyBackLink from '../../../../../frontend/express/public/javascripts/components/helpers/cly-back-link.vue';
import ClyGuide from '../../../../../frontend/express/public/javascripts/components/layout/cly-guide.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyHeader,
        ClyBackLink,
        ClyGuide,
        ClyMain,
        ClyDatatableN
    },
    props: {
        crashId: {type: String}
    },
    mixins: [mixins.hasDrawers("crashSymbol")],
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            authToken: countlyGlobal.auth_token,
            symbolicationEnabled: countlyGlobal.plugins.includes("crash_symbolication"),
            drawerComponent: null,
            crashSymbolsModule: null,
            symbols: {}
        };
    },
    computed: {
        crash: function() {
            return this.$store.getters["countlyCrashes/crash/crash"];
        },
        binaryImages: function() {
            var crash = this.$store.getters["countlyCrashes/crash/crash"];
            var binaryImages;

            if ("binary_images" in crash) {
                try {
                    var binaryImagesMap = JSON.parse(crash.binary_images);
                    binaryImages = Object.keys(binaryImagesMap).map(function(binaryName) {
                        var binaryProps = binaryImagesMap[binaryName];

                        return {
                            name: binaryProps.bn || binaryName,
                            loadAddress: binaryProps.la,
                            uuid: binaryProps.id
                        };
                    });
                }
                catch (err) {
                    binaryImages = [];
                }
            }
            else {
                binaryImages = [];
            }

            return binaryImages;
        }
    },
    methods: {
        refresh: function() {
            var promises = [];
            var self = this;

            promises.push(this.$store.dispatch("countlyCrashes/crash/refresh"));

            if (this.symbolicationEnabled && this.crashSymbolsModule) {
                promises.push(this.crashSymbolsModule.fetchSymbols(false)
                    .then(function(fetchSymbolsResponse) {
                        self.symbols = {};

                        var buildIdMaps = Object.values(fetchSymbolsResponse.symbolIndexing);
                        buildIdMaps.forEach(function(buildIdMap) {
                            Object.keys(buildIdMap).forEach(function(buildId) {
                                self.symbols[buildId] = buildIdMap[buildId];
                            });
                        });

                        return self.symbols;
                    }));
            }

            return Promise.all(promises);
        },
        hasSymbol: function(uuid) {
            return uuid in this.symbols || uuid.toUpperCase() in this.symbols || uuid.toLowerCase() in this.symbols;
        }
    },
    beforeCreate: function() {
        return this.$store.dispatch("countlyCrashes/crash/initialize", this.$route.params.crashId);
    },
    created: function() {
        if (this.symbolicationEnabled) {
            var self = this;
            Promise.all([
                import('../../../../crash_symbolication/frontend/public/components/CrashSymbolDrawer.vue'),
                import('../../../../crash_symbolication/frontend/public/store/index.js')
            ]).then(function(modules) {
                self.drawerComponent = modules[0].default;
                self.crashSymbolsModule = modules[1].default;
            });
        }
    },
    mounted: function() {
        this.refresh();
    }
};
</script>
