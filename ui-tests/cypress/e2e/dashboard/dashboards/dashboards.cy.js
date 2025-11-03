/* eslint-env mocha */
/* global cy, Cypress, expect */

import user from '../../../fixtures/user.json';
const getApiKey = require('../../../api/getApiKey');
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

        // Get the current URL
        cy.url().then((currentUrl) => {

            //Get API key
            getApiKey.request(user.username, user.password).then((apiKey) => {

                //Change preview to PDF and add api_key parameter
                const urlObj = new URL(currentUrl);
                urlObj.pathname = urlObj.pathname.replace('preview', 'pdf');
                urlObj.searchParams.set('api_key', apiKey);
                const pdfURL = urlObj.toString();

                cy.log('Generated PDF URL:', pdfURL);

                //Download the PDF and verify its content
                cy.request({
                    url: pdfURL,
                    encoding: 'binary',
                    timeout: 120000,
                }).then((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.headers['content-type']).to.include('application/pdf');

                    const buf = Buffer.from(response.body, 'binary');
                    expect(buf.slice(0, 4).toString()).to.eq('%PDF');
                    expect(buf.length).to.be.greaterThan(50000); // More than 50KB to ensure it's not empty

                    // Save the PDF to disk (optional)
                    cy.writeFile('/cypress/downloads/generated-report.pdf', buf);
                });
            });
        });

        // Verify PDF content
        cy.task("verifyPdf", {
            filePath: "/cypress/downloads/generated-report.pdf",
            options: {
                referenceLogoPath: "cypress/fixtures/testFiles/countly-logo.png",
                checkText: true
            }
        }).then((result) => {
            expect(result.logoFound).to.be.true;
            expect(result.hasImage).to.be.true;
            expect(result.text).to.include("Sent by Countly | Unsubscribe");
            expect(result.text).to.include("Report settings | Get help");
        });
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
        dashboardsHelper.openDuplicateDashboard();
        dashboardsHelper.clickSaveDashboardButton();
        dashboardsHelper.verifyDashboardCreatedNotification();
        dashboardsHelper.closeNotification();

        dashboardsHelper.verifyCustomDashboardElements({
            dashboardName: "Copy - " + dashboard.dashboardName,
            createdTime: "just now",
            createdBy: "devops+uitests@count.ly",
        });

        //Edit  dashboard
        dashboardsHelper.openEditDashboard();
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
        dashboardsHelper.openDeleteDashboard();
        dashboardsHelper.verifyDeleteDashboardPopupElements(editedDashboard.dashboardName);
        dashboardsHelper.clickYesDeleteDashboardButton();
        dashboardsHelper.verifyDashboardDeletedNotification();
        dashboardsHelper.closeNotification();
        dashboardsHelper.searchDashboard(editedDashboard.dashboardName);
        dashboardsHelper.verifyDashboardShouldBeDeleted();
    });
});
