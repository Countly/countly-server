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

    it('Create custom dashboard with widgets and email report', function() {

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
            createdBy: user.username,
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
});
