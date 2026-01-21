import user from '../../../../fixtures/user.json';
const navigationHelpers = require('../../../../support/navigations');
const loginHelpers = require('../../../../lib/login/login');
const alertsHelpers = require('../../../../lib/dashboard/manage/alerts/alerts');
const { generateAlertFixture } = require('../../../../fixtures/generators/alerts');
const { generateWidgetFixture } = require('../../../../fixtures/generators/widgets');
const widgetsHelpers = require('../../../../lib/dashboard/feedback/ratings/widgets');
const helper = require('../../../../support/helper');
const { faker } = require('@faker-js/faker');

const {
    FEATURE_TYPE,
    TRIGGER_METRICS,
    TRIGGER_VARIABLE,
    TIME_UNITS,
    EMAIL_NOTIFICATION_TYPE
} = require('../../../../support/constants');

describe('Create New Alert', () => {
    beforeEach(function() {
        navigationHelpers.goToLoginPage();
        loginHelpers.login(user.username, user.password);
        navigationHelpers.goToAlertsPage();
    });

    it('Should be added crashes alert and then update the alert data', function() {

        const alert = generateAlertFixture();
        let application = "";
        let appVersion = faker.number.int(10) + "." + faker.number.int(10) + "." + faker.number.int(10);

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
            helper.addData({
                username: user.username,
                password: user.password,
                appName: application,
                appVersion: appVersion
            });
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.CRASHES);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.NEW_CRASH_ERROR);
            alertsHelpers.selectToSpecificAddress(...["demo@count.ly", "test@count.ly"]);
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: "new crash/error"
            });

            // UPDATE THE ALERT WITH NEW DATA
            const alertUpdated = generateAlertFixture();

            alertsHelpers.clickEdit(alert.alertName);
            alertsHelpers.verifyAlertDrawerPageElements({
                isEditPage: true,
                alertName: alert.alertName,
                application: application,
                dataType: FEATURE_TYPE.CRASHES,
                triggerMetric: TRIGGER_METRICS.NEW_CRASH_ERROR,
                emailNotificationType: EMAIL_NOTIFICATION_TYPE.TO_SPECIFIC_ADDRESS,
                email: ['demo@count.ly', 'test@count.ly']
            });

            alertsHelpers.typeAlertName(alertUpdated.alertName);
            alertsHelpers.selectDataType(FEATURE_TYPE.CRASHES);
            alertsHelpers.clickAddFilterButton();
            alertsHelpers.selectFilterCrashesAppVersion(...[appVersion]);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.FATAL_CRASHES_ERRORS_PER_SESSION);
            alertsHelpers.selectDoNotSendEmail();
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification(true);

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1
            });

            alertsHelpers.searchAlertOnDataTable(alertUpdated.alertName);
            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alertUpdated.alertName,
                application: application,
                condition: "fatal crashes/errors per session"
            });
        });
    });

    it('Should be added crashes alert with adding filter', function() {

        const alert = generateAlertFixture();
        var injectionText = "\"><img src=# onerror=alert('POC')>";
        let application = "";
        let appVersion1 = faker.number.int(10) + "." + faker.number.int(10) + "." + faker.number.int(10);
        let appVersion2 = faker.number.int(10) + "." + faker.number.int(10) + "." + faker.number.int(10);

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
            helper.addData({
                username: user.username,
                password: user.password,
                appName: appName,
                appVersion: appVersion1
            });

            helper.addData({
                username: user.username,
                password: user.password,
                appName: appName,
                appVersion: appVersion2
            });
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(injectionText);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.CRASHES);
            alertsHelpers.clickAddFilterButton();
            alertsHelpers.selectFilterCrashesAppVersion(...[appVersion1, appVersion2]);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.FATAL_CRASHES_ERRORS_PER_SESSION);
            alertsHelpers.selectDoNotSendEmail();
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();
            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: injectionText,
                application: application,
                condition: "fatal crashes/errors per session"
            });
        });
    });

    it('Should be added alert data points', function() {

        const alert = generateAlertFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.DATA_POINTS);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.TOTAL_DATA_POINTS);
            alertsHelpers.selectTriggerVariable(TRIGGER_VARIABLE.DECREASED);
            alertsHelpers.typeTriggerValue(alert.triggerValue);
            alertsHelpers.selectTriggerTime(TIME_UNITS.MONTH);
            alertsHelpers.selectDoNotSendEmail();
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: "total data points decreased by " + alert.triggerValue + " % in the last month"
            });
        });
    });

    it('Should be added events alert', function() {

        const alert = generateAlertFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.EVENTS);
            alertsHelpers.selectSubType("Bill Payment");
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.COUNT);
            alertsHelpers.selectTriggerVariable(TRIGGER_VARIABLE.INCREASED);
            alertsHelpers.typeTriggerValue(alert.triggerValue);
            alertsHelpers.selectTriggerTime(TIME_UNITS.HOUR);
            alertsHelpers.selectToSpecificAddress(...["demo@count.ly", "test@count.ly"]);
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: "Bill Payment count increased by " + alert.triggerValue + " % in the last hour"
            });
        });
    });

    it('Should be added events alert with adding filter and delete the alert', function() {

        const alert = generateAlertFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.EVENTS);
            alertsHelpers.selectSubType("Login");
            alertsHelpers.clickAddFilterButton();
            alertsHelpers.selectEventFilter("Method");
            alertsHelpers.typeEventFilterValue(alert.filterValue);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.DURATION);
            alertsHelpers.selectTriggerVariable(TRIGGER_VARIABLE.INCREASED);
            alertsHelpers.typeTriggerValue(alert.triggerValue);
            alertsHelpers.selectTriggerTime(TIME_UNITS.DAY);
            alertsHelpers.selectToSpecificAddress(...["demo@count.ly", "test@count.ly"]);
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: "Login duration increased by " + alert.triggerValue + " % in the last day"
            });

            // DELETE THE ALERT
            alertsHelpers.deleteAlert(alert.alertName);
            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount
            });

            alertsHelpers.searchAlertOnDataTable(alert.alertName);
            alertsHelpers.verifyEmptyTableElements();
        });
    });

    it('Should be added sessions alert', function() {

        const alert = generateAlertFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.SESSIONS);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.OF_SESSIONS);
            alertsHelpers.selectTriggerVariable(TRIGGER_VARIABLE.DECREASED);
            alertsHelpers.typeTriggerValue(alert.triggerValue);
            alertsHelpers.selectTriggerTime(TIME_UNITS.MONTH);
            alertsHelpers.selectDoNotSendEmail();
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: "# of sessions decreased by " + alert.triggerValue + " % in the last month"
            });
        });
    });

    it('Should be added views alert', function() {

        const alert = generateAlertFixture();
        let application = "";
        let pageName = faker.lorem.words({ min: 1, max: 5 });

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
            helper.addData({
                username: user.username,
                password: user.password,
                appName: appName,
                events: '[{"key":"[CLY]_view","count":1,"segmentation":{"visit":1,"name":"' + pageName + '"}}]'
            });
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.VIEWS);
            alertsHelpers.selectSubType(pageName);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.OF_PAGE_VIEWS);
            alertsHelpers.selectTriggerVariable(TRIGGER_VARIABLE.INCREASED);
            alertsHelpers.typeTriggerValue(alert.triggerValue);
            alertsHelpers.selectTriggerTime(TIME_UNITS.MONTH);
            alertsHelpers.selectDoNotSendEmail();
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1,
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: pageName + " # of page views increased by " + alert.triggerValue + " % in the last month"
            });
        });
    });

    it('Should be added alert ratings', function() {

        const alert = generateAlertFixture();
        const widget = generateWidgetFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
            widgetsHelpers.createRatingWithApi(user.username, user.password, appName, widget.widgetName);
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.RATING);
            alertsHelpers.selectSubType(widget.widgetName);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.OF_RESPONSES);
            alertsHelpers.selectTriggerVariable(TRIGGER_VARIABLE.DECREASED);
            alertsHelpers.typeTriggerValue(alert.triggerValue);
            alertsHelpers.selectTriggerTime(TIME_UNITS.DAY);
            alertsHelpers.selectDoNotSendEmail();
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1,
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: widget.widgetName + " # of responses decreased by " + alert.triggerValue + " % in the last day"
            });
        });
    });

    it('Should be added alert ratings with adding filter', function() {

        const alert = generateAlertFixture();
        const widget = generateWidgetFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
            widgetsHelpers.createRatingWithApi(user.username, user.password, appName, widget.widgetName);
        });

        alertsHelpers.getActiveAlertsCount().then((currentActiveAlertsCount) => {
            alertsHelpers.clickAddNewAlertButton();
            alertsHelpers.verifyAlertDrawerPageElements({});
            alertsHelpers.typeAlertName(alert.alertName);
            alertsHelpers.selectApplication(application);
            alertsHelpers.selectDataType(FEATURE_TYPE.RATING);
            alertsHelpers.selectSubType(widget.widgetName);
            alertsHelpers.clickAddFilterButton();
            alertsHelpers.selectFilterRatingPoints(...["1", "2", "3", "4", "5"]);
            alertsHelpers.selectTriggerMetric(TRIGGER_METRICS.NEW_RATING_RESPONSE);
            alertsHelpers.selectDoNotSendEmail();
            alertsHelpers.clickCreateButton();
            alertsHelpers.verifyAlertSavedNotification();

            alertsHelpers.verifyAlertsMetricCardElements({
                activeAlertsNumber: currentActiveAlertsCount + 1,
            });

            alertsHelpers.verifyAlertsDataFromTable({
                index: 0,
                isActive: true,
                alertName: alert.alertName,
                application: application,
                condition: "new rating response"
            });
        });
    });
});