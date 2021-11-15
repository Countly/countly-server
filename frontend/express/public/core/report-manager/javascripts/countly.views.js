/*global app, countlyVue, CV */

(function() {

    var ReportManagerView = countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager.html')
    });

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ReportManagerView,
        });
    };

    app.route("/manage/tasks", "manageJobs", function() {
        this.renderWhenReady(getMainView());
    });
})();