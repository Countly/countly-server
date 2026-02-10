<template>
    <div v-bind:class="[componentId]">
        <div class="text-big font-weight-bold bu-my-4 bu-pt-4">
            {{i18n('crashes.unresolved-crashes')}}
        </div>
        <cly-datatable-n :force-loading="isLoading" :rows="userCrashesData" :exportFormat="formatExportFunction">
            <template v-slot="scope">
                <el-table-column prop="name" column-key="group" :label="i18n('crashes.error')" min-width="360" sortable>
                    <template v-slot="rowScope">
                        <div style="color: #32659D; text-decoration: none;" class="crash-link">
                            <a :href="rowScope.row.link">{{rowScope.row.group}}</a>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="reports" :label="i18n('crashes.reports')" min-width="180" sortable>
                    <template v-slot="rowScope">
                        <div>
                            {{rowScope.row.reports}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="time" column-key="last" :label="i18n('crashes.last_time')" min-width="210" sortable>
                    <template v-slot="rowScope">
                        <div>
                            {{getDateAndTime(rowScope.row.last)}}
                        </div>
                    </template>
                </el-table-column>
            </template>
        </cly-datatable-n>
    </div>
</template>

<script>
import moment from 'moment';
import { i18nMixin, i18n as cvI18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyCrashes from '../store/index.js';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            uid: '',
            userCrashesData: [],
            title: cvI18n('crashes.unresolved-crashes'),
            isLoading: false
        };
    },
    methods: {
        getDateAndTime: function(ts) {
            if (!ts) {
                return "-";
            }
            var d = new Date(ts);
            if (d.getFullYear() <= 1970) {
                ts = ts * 1000;
                d = new Date(ts);
            }
            var date = moment(d).utc().format("MMM Do, YYYY");
            var time = moment(d).utc().format("H:mm:ss");
            return date + " " + time;
        },
        formatExportFunction: function() {
            var tableData = this.userCrashesData;
            var table = [];
            for (var i = 0; i < tableData.length; i++) {
                var item = {};
                item[cvI18n('crashes.error').toUpperCase()] = tableData[i].group;
                item[cvI18n('crashes.reports').toUpperCase()] = tableData[i].reports;
                item[cvI18n('crashes.last_time').toUpperCase()] = this.getDateAndTime(tableData[i].last);
                table.push(item);
            }
            return table;
        },
    },
    created: function() {
        var self = this;
        self.isLoading = true;
        this.uid = this.$route.params.uid;
        countlyCrashes.userCrashes(this.uid)
            .then(function(res) {
                self.isLoading = false;
                if (res) {
                    self.userCrashesData = res.aaData.map(function(data) {
                        return Object.assign(data, { link: '/dashboard#/' + countlyCommon.ACTIVE_APP_ID + '/crashes/' + data.id});
                    });
                }
            });
    }
};
</script>
