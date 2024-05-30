import analyticsLoyaltyUserActivityPageElements from "../../../../support/elements/dashboard/analytics/loyalty/userActivity";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsLoyaltyUserActivityPageElements.PAGE_TITLE,
        labelText: "User Activity",
        tooltipElement: analyticsLoyaltyUserActivityPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the total number of users who started a session on your application, distributed in pre-set categories of numbers of sessions."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsLoyaltyUserActivityPageElements.TAB_USER_ACTIVITY,
        elementText: "User Activity",
    });

    cy.verifyElement({
        element: analyticsLoyaltyUserActivityPageElements.TAB_SLIPPING_AWAY,
        elementText: "Slipping Away",
    });

    cy.verifyElement({
        element: analyticsLoyaltyUserActivityPageElements.TAB_TIMES_OF_DAY,
        elementText: "Times of Day",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsLoyaltyUserActivityPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltyUserActivityPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltyUserActivityPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsLoyaltyUserActivityPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltyUserActivityPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltyUserActivityPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickUserActivityTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltyUserActivityPageElements.TAB_USER_ACTIVITY);
};

const clickSlippingAwayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltyUserActivityPageElements.TAB_SLIPPING_AWAY);
};

const clickTimesOfDayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltyUserActivityPageElements.TAB_TIMES_OF_DAY);
};

module.exports = {
    verifyEmptyPageElements,
    clickUserActivityTab,
    clickSlippingAwayTab,
    clickTimesOfDayTab
};