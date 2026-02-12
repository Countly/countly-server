<template>
<div class="dbviewer-aggregate">
    <cly-header
        :title="i18n('dbviewer.aggregation')"
    >
        <template v-slot:header-top>
            <cly-back-link
                :link="'#/manage/db/' + db + '/' + collection"
                :title="i18n('dbviewer.back-to-dbviewer')">
            </cly-back-link>
        </template>
    </cly-header>
    <cly-main>
        <div class="bu-is-size-5">
            {{ i18n('dbviewer.execute-aggregation', collectionName) }} <cly-tooltip-icon icon="ion-help-circled"></cly-tooltip-icon>
        </div>
        <cly-section class="bg-white bu-p-5 bu-mt-4 dbviewer-aggregate__query-area">
            <el-input
            type="textarea"
            :placeholder="i18n('dbviewer.enter-aggregation-pipeline')"
            v-model="query">
            </el-input>
            <div class="dbviewer-aggregate__query-button-area">
                <el-button :disabled="queryLoading" @click="executeQuery()" type="success" class="bu-mt-4">
                    {{ i18n('dbviewer.generate-aggregate-report') }}
                </el-button>
            </div>
        </cly-section>
            <cly-notification v-if="removed" class="bu-mb-5 cly-vue-events-all__alerts" :text="removed" ></cly-notification>
        <cly-section>
            <cly-datatable-n :force-loading="queryLoading" :rows="aggregationResult" :prevent-default-sort="true">
                <template v-slot="scope">
                    <el-table-column prop="_id" label="_id" min-width="250" fixed>
                        <template v-slot="rowScope">
                            {{ rowScope.row._id }}
                        </template>
                    </el-table-column>
                    <el-table-column v-if="aggregationResult[0]._id === 'query_not_executed_yet'" prop="uid" label="uid" min-width="250" fixed>
                        <template v-slot="rowScope">
                            -
                        </template>
                    </el-table-column>
                    <el-table-column v-if="aggregationResult[0]._id === 'query_not_executed_yet'" prop="did" label="did" min-width="250" fixed>
                        <template v-slot="rowScope">
                            -
                        </template>
                    </el-table-column>
                    <el-table-column v-if="aggregationResult[0]._id === 'query_not_executed_yet'" prop="brw" label="brw" min-width="250" fixed>
                        <template v-slot="rowScope">
                            -
                        </template>
                    </el-table-column>
                    <el-table-column v-if="aggregationResult[0]._id === 'query_not_executed_yet'" prop="brwv" label="brwv" min-width="250" fixed>
                        <template v-slot="rowScope">
                            -
                        </template>
                    </el-table-column>
                    <el-table-column v-if="field !== '_id'" min-width="150" v-for="field in fields" :prop="field" :label="field">
                        <template v-slot="rowScope">
                            <span>{{ decodeHtml(rowScope.row[field]) }}</span>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-section>
    </cly-main>
</div>
</template>

<script>
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import * as countlyDBviewer from '../store/index.js';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            query: '',
            db: (this.$route.params && this.$route.params.db),
            collection: (this.$route.params && this.$route.params.collection),
            aggregationResult: [{'_id': 'query_not_executed_yet'}],
            queryLoading: false,
            fields: [],
            collectionName: (this.$route.params && this.$route.params.collection),
        };
    },
    methods: {
        backToDBViewer: function() {
            window.location = '#/manage/db/' + this.db + '/' + this.collection;
        },
        decodeHtml: function(str) {
            return countlyCommon.unescapeHtml(str);
        },
        executeQuery: function() {
            var self = this;

            try {
                var query = JSON.stringify(JSON.parse(this.query));
                this.queryLoading = true;
                countlyDBviewer.executeAggregation(this.db, this.collection, query, countlyGlobal.ACTIVE_APP_ID, null, function(err, res) {
                    self.updatePath(self.query);
                    if (res) {
                        var map = [];
                        res.aaData.forEach(function(row) {
                            Object.keys(row).forEach(function(key) {
                                map[key] = true;
                            });
                        });
                        self.aggregationResult = res.aaData;
                        if (res.aaData.length) {
                            self.fields = Object.keys(map);
                        }
                        if (res.removed && typeof res.removed === 'object' && Object.keys(res.removed).length > 0) {
                            self.removed = i18n('dbviewer.removed-warning') + Object.keys(res.removed).join(", ");

                        }
                        else {
                            self.removed = "";
                        }
                    }
                    if (err) {
                        var message = i18n('dbviewer.server-error');
                        if (err.responseJSON && err.responseJSON.result && typeof err.responseJSON.result === "string") {
                            message = err.responseJSON.result;
                        }
                        notify({
                            message: message,
                            type: "error",
                            sticky: false,
                            clearAll: true
                        });
                    }
                    self.queryLoading = false;
                });
            }
            catch (err) {
                notify({
                    message: i18n('dbviewer.invalid-pipeline'),
                    type: "error"
                });
                self.queryLoading = false;
            }
        },
        updatePath: function(query) {
            app.navigate("#/manage/db/aggregate/" + this.db + "/" + this.collection + "/" + query);
        },
        getCollectionName: function() {
            var self = this;
            if (this.db && this.collection) {
                var dbs = countlyDBviewer.getData();
                if (dbs.length) {
                    this.collectionName = countlyDBviewer.getName(this.db, this.collection);
                }
                else {
                    countlyDBviewer.initialize()
                        .then(function() {
                            self.collectionName = countlyDBviewer.getName(self.db, self.collection);
                        });
                }
            }
        }
    },
    created: function() {
        if (this.$route && this.$route.params && this.$route.params.query) {
            this.query = this.$route.params.query;
            this.executeQuery();
        }
        if (!(this.$route && this.$route.params && this.$route.params.collection) || !(this.$route.params && this.$route.params.db)) {
            window.location = '#/manage/db';
        }
        this.getCollectionName();
    }
};
</script>
