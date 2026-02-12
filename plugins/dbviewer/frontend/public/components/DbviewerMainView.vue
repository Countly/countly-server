<template>
<div class="dbviewer-main">
    <cly-header
        :title="i18n('dbviewer.title')"
    >
        <template v-slot:header-tabs>
            <cly-dynamic-tabs
                v-model="dynamicTab"
                skin="secondary"
                :tab="dynamicTab"
                :tabs="tabs"
                :apps="apps"
                :collections="collections"
                :db="db"
                :collection="collection"
                :index="index">
                <template v-slot:tables="scope">
                    <span>{{ scope.tab.title }}</span>
                </template>
            </cly-dynamic-tabs>
        </template>
    </cly-header>
</div>
</template>

<script>
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import * as countlyDBviewer from '../store/index.js';
import DbviewerTabView from './DbviewerTabView.vue';
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            dynamicTab: (this.$route.params && this.$route.params.db) || "countly",
            db: (this.$route.params && this.$route.params.db) || null,
            collection: (this.$route.params && this.$route.params.collection) || null,
            tabs: [],
            apps: [],
            collections: {},
            index: (this.$route.params && this.$route.params.index) || null,
        };
    },
    methods: {
        prepareTabs: function(dbs) {
            for (var i = 0; i < dbs.length; i++) {
                this.tabs.push({
                    title: this.formatDBName(dbs[i].name),
                    name: dbs[i].name,
                    component: DbviewerTabView,
                    route: '#/' + countlyCommon.ACTIVE_APP_ID + '/manage/db/' + dbs[i].name
                });
            }
        },
        prepareCollectionList: function(dbs) {
            for (var i = 0; i < dbs.length; i++) {
                this.collections[dbs[i].name] = {
                    list: [],
                    map: {}
                };
                for (var j = 0; j < dbs[i].list.length; j++) {
                    this.collections[dbs[i].name].list.push({
                        value: dbs[i].collections[dbs[i].list[j]],
                        label: dbs[i].list[j]
                    });
                    this.collections[dbs[i].name].map[dbs[i].collections[dbs[i].list[j]]] = dbs[i].list[j];
                }
            }
        },
        formatDBName: function(name) {
            var parts = name.split("_");

            for (var i = 0; i < parts.length; i++) {
                if (parts[i] === "fs") {
                    parts[i] = "File System";
                }
                else {
                    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
                }
            }

            return parts.join(" ") + " Database";
        },
        prepareApps: function() {
            var apps = countlyGlobal.apps || {};
            var appKeys = Object.keys(apps);
            var formattedApps = [];

            for (var i = 0; i < appKeys.length; i++) {
                formattedApps.push({
                    label: apps[appKeys[i]].name,
                    value: apps[appKeys[i]]._id
                });
            }

            formattedApps.sort(function(a, b) {
                var aLabel = (a && a.label) || '';
                var bLabel = (b && b.label) || '';
                var locale = countlyCommon.BROWSER_LANG || 'en';

                if (aLabel && bLabel) {
                    return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
                }

                if (!aLabel && bLabel) {
                    return 1;
                }

                if (aLabel && !bLabel) {
                    return -1;
                }

                return 0;
            });

            formattedApps.unshift({
                label: 'All Apps',
                value: 'all'
            });

            this.apps = formattedApps;
        }
    },
    created: function() {
        var self = this;
        var dbs = countlyDBviewer.getData();

        if (!dbs.length) {
            countlyDBviewer.initialize()
                .then(function() {
                    dbs = countlyDBviewer.getData();
                    self.prepareTabs(dbs);
                    self.prepareCollectionList(dbs);
                });
        }
        else {
            this.prepareTabs(dbs);
            this.prepareCollectionList(dbs);
        }

        this.prepareApps();
    }
};
</script>
