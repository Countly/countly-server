import { views } from '../../javascripts/countly/vue/core.js';
import app from '../../javascripts/countly/countly.template.js';
import { validateGlobalAdmin } from '../../javascripts/countly/countly.auth.js';
import { extend } from 'vee-validate';
import cronstrue from 'cronstrue';

import JobsView from './components/JobsView.vue';
import JobDetailsView from './components/JobDetailsView.vue';
import './assets/main.scss';

// Register VeeValidate custom validator for cron expressions
extend('validCron', {
    validate: function(inpValue) {
        var valid = true;

        try {
            cronstrue.toString(inpValue);
        }
        catch (_) {
            valid = false;
        }

        return {
            valid: valid,
        };
    },
});

/**
 * Get the jobs listing view wrapped for Backbone routing
 * @returns {Object} Backbone wrapper view
 */
var getJobsView = function() {
    return new views.BackboneWrapper({
        component: JobsView,
        vuex: []
    });
};

/**
 * Get the job details view wrapped for Backbone routing
 * @param {string} jobName The job name parameter
 * @returns {Object} Backbone wrapper view
 */
var getJobDetailsView = function(jobName) {
    var jobDetailsView = new views.BackboneWrapper({
        component: JobDetailsView,
        vuex: []
    });
    // Pass jobName as a route param
    jobDetailsView.params = { jobName: jobName };
    return jobDetailsView;
};

// Register routes (admin only)
if (validateGlobalAdmin()) {
    // Jobs listing route
    app.route("/manage/jobs", "manageJobs", function() {
        this.renderWhenReady(getJobsView());
    });

    // Job details route
    app.route("/manage/jobs/:jobName", 'jobs-details', function(jobName) {
        this.renderWhenReady(getJobDetailsView(jobName));
    });
}
