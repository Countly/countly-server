<template>
    <div class="ratings-external-tabs__user-profile bu-mt-5">
        <div class="text-bold bu-mb-4">
            {{ title }} <cly-tooltip-icon icon="ion-help-circled"></cly-tooltip-icon>
        </div>
        <user-feedback-ratings-table :ratings="ratingsData" :is-loading="isLoading"></user-feedback-ratings-table>
    </div>
</template>

<script>
import countlyVue, { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import starRatingPlugin from '../store/index.js';
import UserFeedbackRatingsTable from './UserFeedbackRatingsTable.vue';

export default {
    mixins: [countlyVue.mixins.i18n],
    components: {
        'user-feedback-ratings-table': UserFeedbackRatingsTable
    },
    data: function() {
        return {
            uid: '',
            ratingsData: [],
            title: i18n('feedback.ratings'),
            isLoading: false
        };
    },
    created: function() {
        this.uid = this.$route.params.uid;
        var self = this;
        this.isLoading = true;
        starRatingPlugin.requestFeedbackData({uid: this.uid, period: "noperiod"})
            .then(function() {
                self.ratingsData = starRatingPlugin.getFeedbackData().aaData;
                self.ratingsData.map(function(rating) {
                    rating.ts = countlyCommon.formatTimeAgo(rating.ts);
                });
                self.isLoading = false;
            });
    }
};
</script>
