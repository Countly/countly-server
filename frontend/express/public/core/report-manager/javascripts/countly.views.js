/*global app, countlyVue, CV, Vue */

(function() {

    var ManualReportsView = countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-manual.html')
    });

    var AutomaticReportsView = countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-auto.html')
    });

    var ReportManagerView = countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager.html'),
        data: function() {
            return {
                dynamicTab: "manual-reports-tab",
                localTabs: [
                    {
                        title: CV.i18n('report-maanger.manually-created'),
                        name: "manual-reports-tab",
                        component: ManualReportsView
                    },
                    {
                        title: CV.i18n('report-maanger.automatically-created'),
                        name: "automatic-reports-tab",
                        component: AutomaticReportsView
                    }
                ]
            };
        }
    });

    Vue.component("cly-report-manager-table", countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-table.html')
    }));

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ReportManagerView,
        });
    };

    app.route("/manage/tasks", "manageJobs", function() {
        this.renderWhenReady(getMainView());
    });
})();