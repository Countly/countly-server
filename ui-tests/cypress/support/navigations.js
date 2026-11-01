/* global expect */
import sidebarElements from './elements/sidebar/sidebar';
const ratingsHelpers = require('../lib/dashboard/feedback/ratings/ratings');

/**
 * Wait until no Element UI loading mask sits over the centre of an element.
 *
 * `v-loading` masks stay in the DOM after use (hidden by `v-show`), so
 * `.el-loading-mask` never stops existing; what matters for a click is whether
 * a mask that is still showing, or still fading out, is the topmost element at
 * the click point. This checks exactly that condition, retried within a bound,
 * so the click that follows runs its actionability checks against an
 * uncovered element.
 *
 * @param {string} item data-test-id of the element about to be clicked
 * @param {number} timeout how long a mask may keep covering it
 */
const waitForLoadingMaskToClear = (item, timeout = 30000) => {
    cy.get(`[data-test-id="${item}"]`, { log: false }).first().scrollIntoView({ log: false });
    cy.get(`[data-test-id="${item}"]`, { timeout }).first().should(($el) => {
        const rect = $el[0].getBoundingClientRect();
        const doc = $el[0].ownerDocument;
        const top = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const mask = top && top.closest('.el-loading-mask');
        expect(mask, `loading mask over ${item}${mask ? ` (${mask.className})` : ''}`).to.equal(null);
    });
};

/**
 * Open a collapsible sidebar section and click one of its submenu items.
 *
 * The helpers used to read the section's arrow state once (`.is-active`) and
 * skip or click the header accordingly. The sidebar rewrites that state on its
 * own: after every route change `identifySelected` runs on a timer and resets
 * the accordion's v-model to the current page's section, collapsing whatever
 * the test had just expanded (or expanding what it was about to toggle). The
 * click then hit an item inside a `display: none` wrap.
 *
 * This checks the condition the click actually needs, the item being visible,
 * and re-clicks the header until it is, within a bound. "Visible" must hold on
 * two reads 500ms apart so a reset that lands right after the first read is
 * caught before clicking.
 *
 * @param {string} sectionHeader data-test-id of the section header label
 * @param {string} item data-test-id of the submenu item to click
 * @param {number} attempts how many times the header may be clicked
 */
const openSidebarSubmenuItem = (sectionHeader, item, attempts = 5) => {
    const itemSelector = `[data-test-id="${item}"]`;
    const isItemVisible = ($body) => {
        const $item = $body.find(itemSelector);
        return $item.length > 0 && $item.is(':visible');
    };

    const tryOpen = (remaining) => {
        cy.wait(500, { log: false });
        cy.get('body', { log: false }).then(($body) => {
            if (isItemVisible($body)) {
                cy.wait(500, { log: false });
                cy.get('body', { log: false }).then(($bodyAgain) => {
                    if (!isItemVisible($bodyAgain) && remaining > 0) {
                        tryOpen(remaining - 1);
                    }
                });
                return;
            }
            if (remaining <= 0) {
                // Let the assertion below report the failure with its own message.
                return;
            }
            waitForLoadingMaskToClear(sectionHeader);
            cy.clickElement(sectionHeader);
            tryOpen(remaining - 1);
        });
    };

    tryOpen(attempts);
    cy.getElement(item).should('be.visible');
    waitForLoadingMaskToClear(item);
    cy.clickElement(item);
};

const goToLoginPage = () => {
    cy.visit('/login');
};

const goToLogoutPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MY_PROFILE);
    cy.clickElement(sidebarElements.SIDEBAR_MY_PROFILE_OPTIONS.LOGOUT);
    // Logout is a form POST that redirects to /login; wait for it so a following visit cannot race the old session.
    cy.location('pathname').should('match', /\/login$/);
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
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.VISITOR_LOYALTY);
};

const goToAnalyticsUsersOverview = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.VISITOR_ANALYTICS);
};

const goToAnalyticsSessionAnalyticsOverview = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.SESSION_ANALYTICS);
};

const goToAnalyticsViews = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.PAGE_VIEWS);
};

const goToAnalyticsSources = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.ACQUISITION);
};

const goToAnalyticsTechnologyPlatforms = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.TECHNOLOGY);
};

const goToAnalyticsGeoCountries = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.GEO);
};

const goToAnalyticsEventsOverview = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS_LIST.OVERVIEW);
};

const goToAnalyticsAllEvents = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.EVENTS_LIST.ALL_EVENTS);
};

const goToPushNotifications = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.PUSH_NOTIFICATIONS);
};

const goToFeedbackRatingsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.FEEDBACK, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.FEEDBACK_LIST.RATINGS);
};

const goToFeedbackRatingsWidgetsPage = () => {
    goToFeedbackRatingsPage();
    ratingsHelpers.clickRatingWidgetsTab();
};

const goToCrashesOverviewPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.CRASHES, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.CRASHES_LIST.OVERVIEW);
};

const goToRemoteConfigPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.REMOTE_CONFIG);
};

const goToReportManagerPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.REPORT_MANAGER);
};

const goToDataManagerPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.DATA_MANAGER);
};

const goToDataPopulatorPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.DATA_POPULATOR);
};

const goToIncomingDataLogsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.INCOMING_DATA_LOGS);
};

const goToSdkManagerPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.SDK_MANAGER);
};

const goToComplianceHubMetricsPage = () => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU);
    openSidebarSubmenuItem(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES, sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.UTILITIES_LIST.COMPLIANCE_HUB);
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