<template>
    <el-card class="box-card cly-vue-push-notification-details-summary-card">
        <div>
            <el-table
                :empty-text="i18n('push-notification.no-errors-found')"
                :data="errors"
                border
                style="width:100%">
                    <el-table-column type="expand">
                        <template slot-scope="scope">
                            <div class="bu-level bu-mb-4 bu-is-flex bu-is-flex-direction-column bu-is-align-items-flex-start">
                                <div class="bu-level-left text-medium font-weight-bold">
                                    <span class="text-small font-weight-bold text-uppercase bu-mb-2 bu-ml-5">{{i18n('push-notification.error-detail')}}</span>
                                </div>
                                <div class="white-bg cly-vue-push-notification-details-expand-row">
                                    <p class="bu-ml-5">{{scope.row.description || '-'}}</p>
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        :label="i18n('push-notification.error-code')"
                        min-width="30">
                        <template v-slot="scope">
                         <span style="white-space:normal">{{scope.row.code}}</span>
                        </template>
                    </el-table-column>
                    <el-table-column
                        :label="i18n('push-notification.affected-users')"
                        prop="affectedUsers"
                        min-width="25">
                    </el-table-column>
            </el-table>
        </div>
    </el-card>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    computed: {
        globalError: function() {
            return this.$store.state.countlyPushNotificationDetails.pushNotification.error;
        },
        errors: function() {
            if (this.globalError) {
                var allErrors = this.$store.state.countlyPushNotificationDetails.pushNotification.errors;
                var copyErrors = allErrors.concat([]);
                copyErrors.unshift(this.globalError);
                return copyErrors;
            }
            return this.$store.state.countlyPushNotificationDetails.pushNotification.errors;
        },
    }
};
</script>
