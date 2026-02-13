<template>
    <cly-datatable-n test-id="ratings-comments-table" :persist-key="commentsTablePersistKey" :data-source="remoteTableDataSource" width="100%">
        <template v-slot="scope">
            <el-table-column prop="comment" :label="i18n('feedback.comment')" min-width="260">
                <template v-slot="rowScope">
                    <div class="comment-table__text-cursor" v-tooltip="{content:rowScope.row.comment,placement:'auto'}">
                        <p class="text-medium" :data-test-id="'ratings-comment-table-comment-row-' + rowScope.$index">
                            {{ rowScope.row.comment }}
                        </p>
                    </div>
                </template>
            </el-table-column>
            <el-table-column sortable="true" prop="rating" :label="i18n('feedback.rating')" min-width="80">
                <template v-slot="rowScope">
                    <span class="text-medium" :data-test-id="'ratings-comment-table-rating-row-' + rowScope.$index">
                        <span :class="'rating-color rating-comments-color-' + rowScope.row.rating"></span> {{ rowScope.row.rating}}
                    </span>
                </template>
            </el-table-column>
            <el-table-column sortable="true" prop="ts" :label="i18n('feedback.time')" min-width="120">
                <template v-slot="rowScope">
                    <span class="text-medium" :data-test-id="'ratings-comment-table-time-row-' + rowScope.$index">{{unescapeHtml(rowScope.row.ts)}}</span>
                </template>
            </el-table-column>
            <el-table-column prop="email" :label="i18n('feedback.email')" min-width="200">
                <template v-slot="rowScope">
                    <span class="text-medium" :data-test-id="'ratings-comment-table-email-row-' + rowScope.$index">
                        {{ rowScope.row.email }}
                    </span>
                </template>
            </el-table-column>
            <el-table-column prop="userLink" min-width="120">
                <template v-slot="rowScope">
                    <span v-if="rowScope.row.hover">
                        <a :href="'#/users/' + rowScope.row.uid" target="_blank">
                            <el-button class="text-smallish bu-is-clickable">{{ i18n('feedback.view.user') }}</el-button>
                        </a>
                    </span>
                </template>
            </el-table-column>
        </template>
    </cly-datatable-n>
</template>

<script>
import countlyVue from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import moment from 'moment';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

function replaceEscapes(str) {
    if (typeof str === 'string') {
        return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    }
    return str;
}

export default {
    components: {
        ClyDatatableN
    },
    mixins: [countlyVue.mixins.i18n, countlyVue.mixins.commonFormatters],
    props: {
        comments: Array,
        loadingState: Boolean,
        filter: {
            type: Object,
            default: function() {
                return {};
            },
            required: false
        }
    },
    watch: {
        filter: {
            immediate: true,
            handler: function(newValue) {
                this.filterVal = newValue;
                this.tableStore.dispatch("fetchCommentsTable");
            }
        }
    },
    methods: {
        dateChanged: function() {
            this.tableStore.dispatch("fetchCommentsTable");
        },
        decode: function(str) {
            if (typeof str === 'string') {
                return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
            }
            return str;
        }
    },
    computed: {
        preparedRows: function() {
            var self = this;
            return this.comments.map(function(comment) {
                comment.ts = countlyCommon.formatTimeAgoText(comment.ts).tooltip;
                comment.time = moment.unix(comment.ts).format("DD MMMM YYYY HH:MM:SS");
                comment.comment = self.decode(comment.comment);
                return comment;
            });
        }
    },
    data: function() {
        var self = this;
        var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("commentsTable", {
            columns: ['comment', 'ts', 'email', 'rating'],
            onRequest: function() {
                var data = {app_id: countlyCommon.ACTIVE_APP_ID, period: countlyCommon.getPeriodForAjax()};
                var filter = self.filterVal;
                if (filter) {
                    if (filter.rating && filter.rating !== "") {
                        data.rating = filter.rating;
                    }
                    if (filter.version && filter.version !== "") {
                        data.version = filter.version.replace(":", ".");
                    }
                    if (filter.platform && filter.platform !== "") {
                        data.platform = filter.platform;
                    }
                    if (filter.widget && filter.widget !== "") {
                        data.widget_id = filter.widget;
                    }
                    if (filter.uid && filter.uid !== "") {
                        data.uid = filter.uid;
                    }
                }
                return {
                    type: "GET",
                    url: countlyCommon.API_URL + "/o/feedback/data",
                    data: data
                };
            },
            onError: function(context, err) {
                throw err;
            },
            onReady: function(context, rows) {
                rows.forEach(function(row) {
                    row.ts = countlyCommon.formatTimeAgoText(row.ts).tooltip;
                    row.time = moment.unix(row.ts).format("DD MMMM YYYY HH:MM:SS");
                    row.comment = replaceEscapes(row.comment);
                });
                return rows;
            }
        }));
        return {
            tableStore: tableStore,
            filterVal: this.filter,
            commentsTablePersistKey: 'comments_table_' + countlyCommon.ACTIVE_APP_ID,
            remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "commentsTable")
        };
    }
};
</script>
