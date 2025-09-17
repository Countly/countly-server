import user from '../../../fixtures/user.json';
const navigationHelpers = require('../../../support/navigations');
const helper = require('../../../support/helper');
const loginHelpers = require('../../../lib/login/login');
const dashboardsHelper = require('../../../lib/dashboard/dashboards/dashboards');
const reportHelper = require('../../../lib/dashboard/manage/reports/reports');
const { generateDashboardFixture } = require('../../../fixtures/generators/dashboards');
const { generateReportFixture } = require('../../../fixtures/generators/reports');
const { VISUALIZATION_TYPE, TIME_UNITS } = require('../../../support/constants');


describe('Create New Custom Dashboard', () => {
    beforeEach(function() {
        navigationHelpers.goToLoginPage();
        loginHelpers.login(user.username, user.password);
        navigationHelpers.openDashboardsMenu();
    });

    it(`
        Create a custom dashboard with a widget and an email report, and then verify the report preview using these parameters:
        //***Dashboard***
        Dashboard Visibility: All Users (default)
        //***Widget***
        Widget Type: Analytics (default)
        Data Type: Sessions (default)
        App Count: Single App (default)
        Visualization Type: Time Series
        Metric: New Sessions
        //***Report***
        Report Type: Dashboard Report
        Frequency: Daily
    `, function() {

        const dashboard = generateDashboardFixture();
        const report = generateReportFixture();

        dashboardsHelper.clickDashboardsNewButton();
        dashboardsHelper.typeDashboardName(dashboard.dashboardName);
        dashboardsHelper.clickCreateDashboardButton();
        dashboardsHelper.verifyDashboardCreatedNotification();
        dashboardsHelper.closeNotification();

        dashboardsHelper.verifyCustomDashboardElements({
            dashboardName: dashboard.dashboardName,
            createdTime: "just now",
            createdBy: "devops+uitests@count.ly",
        });

        dashboardsHelper.clickNewWidgetButton();
        dashboardsHelper.selectSourceApp("default");
        dashboardsHelper.selectVisualizationType(VISUALIZATION_TYPE.TIME_SERIES);
        dashboardsHelper.selectMetric("New Sessions");
        dashboardsHelper.clickCreateWidgetButton();
        dashboardsHelper.verifyWidgetCreatedNotification();
        dashboardsHelper.closeNotification();

        dashboardsHelper.verifyCustomDashboardWidgetElements({
            widgetTitle: "Analytics",
            widgetAppName: "default",
            widgetItem: "New Sessions",
            widgetLabel: "New Sessions"
        });

        dashboardsHelper.openCreateNewReportDrawer();
        reportHelper.typeReportName(report.reportName);
        reportHelper.typeReportToReceive(...["demo@count.ly", "test@count.ly"]);
        reportHelper.selectReportTypeDashboard();
        reportHelper.selectFrequencyType(TIME_UNITS.DAILY);
        reportHelper.selectDateRange("60 days");
        reportHelper.selectTime("04:00");
        reportHelper.selectTimezone("Istanbul");
        reportHelper.clickCreateReportButton();
        reportHelper.verifyReportCreatedNotification();
        reportHelper.closeNotification();

        reportHelper.verifyReportsDataTable({
            isStatusChecked: true,
            reportName: report.reportName,
            email: "demo@count.ly test@count.ly",
            data: "Dashboard " + dashboard.dashboardName,
            frequency: helper.capitalize(TIME_UNITS.DAILY),
            time: "at 04:00, (GMT+03:00) Istanbul",
        });

        reportHelper.openReportPreviewButton();
        reportHelper.verifyReportPreviewPageImage();
    });

    it(`Create a private custom dashboard and duplicate it and edit it and delete it then verify the flow`, function() {

        const dashboard = generateDashboardFixture();
        const editedDashboard = generateDashboardFixture();
        const editPermissionEmail = generateDashboardFixture();
        const viewOnlyPermissionEmail = generateDashboardFixture();

        dashboardsHelper.clickDashboardsNewButton();
        dashboardsHelper.typeDashboardName(dashboard.dashboardName);
        dashboardsHelper.selectPrivateDashboardVisibility();
        dashboardsHelper.selectNotifyAllUsersViaEmail();
        dashboardsHelper.selectUseCustomRefreshRate();
        dashboardsHelper.clickCreateDashboardButton();
        dashboardsHelper.verifyDashboardCreatedNotification();
        dashboardsHelper.closeNotification();

        dashboardsHelper.verifyCustomDashboardElements({
            dashboardName: dashboard.dashboardName,
            createdTime: "just now",
            createdBy: "devops+uitests@count.ly",
        });

        // Duplicate dashboard
        dashboardsHelper.duplicateDashboard();
        dashboardsHelper.clickSaveDashboardButton();
        dashboardsHelper.verifyDashboardCreatedNotification();
        dashboardsHelper.closeNotification();

        dashboardsHelper.verifyCustomDashboardElements({
            dashboardName: "Copy - " + dashboard.dashboardName,
            createdTime: "just now",
            createdBy: "devops+uitests@count.ly",
        });

        //Edit  dashboard
        dashboardsHelper.editDashboard();
        dashboardsHelper.typeDashboardName(editedDashboard.dashboardName);
        dashboardsHelper.selectSomeSpecificUsersDashboardVisibility();
        dashboardsHelper.typeEditPermissionEmail(editPermissionEmail.email);
        dashboardsHelper.typeViewOnlyPermissionEmail(viewOnlyPermissionEmail.email);
        dashboardsHelper.clickSaveDashboardButton();
        dashboardsHelper.verifyDashboardEditedNotification();
        dashboardsHelper.closeNotification();

        dashboardsHelper.verifyCustomDashboardElements({
            dashboardName: editedDashboard.dashboardName,
            createdTime: "seconds",
            createdBy: "devops+uitests@count.ly",
        });

        //Delete dashboard
        dashboardsHelper.deleteDashboard();
        dashboardsHelper.verifyDashboardShouldBeDeleted(editedDashboard.dashboardName);
        dashboardsHelper.clickYesDeleteDashboardButton();
        dashboardsHelper.verifyDashboardDeletedNotification();
        dashboardsHelper.closeNotification();

    });
});
