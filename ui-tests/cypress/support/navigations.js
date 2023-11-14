import sidebarElements from './elements/sidebar';
const ratingsHelpers = require('../lib/feedback/ratings/ratings');

const goToLoginPage = () => {
    cy.visit('/login');
};

const goToLogoutPage = () => {
    cy.visit('/logout');
};

const goToDashboardPage = () => {
    cy.visit('/dashboard');
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

const goToFeedbackRatingsWidgetsPage = () => {
    goToFeedbackRatingsPage();
    ratingsHelpers.clickRatingWidgetsTab();
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
    goToVisitorLoyalty,
    isNavigatedToDashboard,
    goToFeedbackRatingsWidgetsPage,
    getAppNameFromSidebar,
    goToDataPopulatorPage,
};