import sidebarElements from './elements/sidebar/sidebar';
const ratingsHelpers = require('../lib/dashboard/feedback/ratings/ratings');

const goToLoginPage = () => {
    cy.visit('/login');
};

const goToLogoutPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MY_PROFILE);
    cy.clickElement(sidebarElements.SIDEBAR_MY_PROFILE_OPTIONS.LOGOUT);
};

const goToDashboardPage = () => {
    cy.visit('/dashboard');
};

const openDashboardsMenu = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.DASHBOARDS);
};

const goToHomePage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.HOME);
};

const goToVisitorLoyalty = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.VISITOR_LOYALTY);
};

const goToAnalyticsUsersOverview = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.VISITOR_ANALYTICS);
};

const goToAnalyticsSessionAnalyticsOverview = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.SESSION_ANALYTICS);
};

const goToAnalyticsViews = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.PAGE_VIEWS);
};

const goToAnalyticsSources = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.ACQUISITION);
};

const goToAnalyticsTechnologyPlatforms = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.TECHNOLOGY);
};

const goToAnalyticsGeoCountries = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.GEO);
};

const goToAnalyticsEventsOverview = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS_LIST.OVERVIEW);
};

const goToAnalyticsAllEvents = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS_LIST.ALL_EVENTS);
};

const goToPushNotifications = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.PUSH_NOTIFICATIONS);
};

const goToFeedbackRatingsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.FEEDBACK_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.FEEDBACK);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.FEEDBACK_LIST.RATINGS);
};

const goToFeedbackRatingsWidgetsPage = () => {
    goToFeedbackRatingsPage();
    ratingsHelpers.clickRatingWidgetsTab();
};

const goToCrashesOverviewPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.CRASHES_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.CRASHES);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.CRASHES_LIST.OVERVIEW);
};

const goToRemoteConfigPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.REMOTE_CONFIG);
};

const goToReportManagerPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.REPORT_MANAGER);
};

const goToDataManagerPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.DATA_MANAGER);
};

const goToDataPopulatorPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.DATA_POPULATOR);
};

const goToIncomingDataLogsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.INCOMING_DATA_LOGS);
};

const goToSdkManagerPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.SDK_MANAGER);
};

const goToComplianceHubMetricsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.wait(500);
    cy
        .elementExists(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_ACTIVE_ARROW)
        .then((isExists) => {
            if (!isExists) {
                cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES);
            }
        });
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.COMPLIANCE_HUB);
};


const goToUserManagementPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.USER_MANAGEMENT);
};

const goToApplicationsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.APPLICATIONS);
};

const goToPresetManagementPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.PRESET_MANAGEMENT);
};

const goToSettingsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.SETTINGS);
};

const goToDataPointsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.DATA_POINTS);
};

const goToLogsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.LOGS);
};

const goToJobsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.JOBS);
};

const goToFeatureManagementPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.FEATURE_MANAGEMENT);
};

const goToEMailReportsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.EMAIL_REPORTS);
};

const goToAlertsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.ALERTS);
};

const goToHooksPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.HOOKS);
};

const goToDbViewerPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MANAGEMENT);
    cy.clickElement(sidebarElements.SIDEBAR_MANAGEMENT_OPTIONS.DB_VIEWER);
};

const isNavigatedToDashboard = () => {
    cy.shouldUrlInclude('/dashboard');
    cy.shouldBeVisible(sidebarElements.SIDEBAR);
};

const getAppNameFromSidebar = () => {
    return cy.getElement(sidebarElements.SIDEBAR_MAINMENU_APP_NAME).getText();
};

module.exports = {
    goToLoginPage,
    goToLogoutPage,
    goToHomePage,
    goToDashboardPage,
    openDashboardsMenu,
    goToVisitorLoyalty,
    goToAnalyticsUsersOverview,
    goToAnalyticsSessionAnalyticsOverview,
    goToAnalyticsViews,
    goToAnalyticsSources,
    goToAnalyticsTechnologyPlatforms,
    goToAnalyticsGeoCountries,
    goToAnalyticsEventsOverview,
    goToAnalyticsAllEvents,
    goToPushNotifications,
    goToFeedbackRatingsPage,
    goToFeedbackRatingsWidgetsPage,
    goToCrashesOverviewPage,
    goToRemoteConfigPage,
    goToReportManagerPage,
    goToDataManagerPage,
    goToDataPopulatorPage,
    goToIncomingDataLogsPage,
    goToSdkManagerPage,
    goToComplianceHubMetricsPage,
    goToUserManagementPage,
    goToApplicationsPage,
    goToPresetManagementPage,
    goToSettingsPage,
    goToDataPointsPage,
    goToLogsPage,
    goToJobsPage,
    goToFeatureManagementPage,
    goToEMailReportsPage,
    goToAlertsPage,
    goToHooksPage,
    goToDbViewerPage,
    isNavigatedToDashboard,
    getAppNameFromSidebar
};