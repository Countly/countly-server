import analyticsLoyaltySlippingAwayPageElements from "../../../../support/elements/dashboard/analytics/loyalty/slippingAway";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsLoyaltySlippingAwayPageElements.PAGE_TITLE,
        labelText: "Slipping Away",
        tooltipElement: analyticsLoyaltySlippingAwayPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the total number of users who haven't had a session on your application, distributed in categories of  7, 14, 30, 60, and 90 days. Granular data on these users can be made visible by activating User Profiles."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsLoyaltySlippingAwayPageElements.TAB_USER_ACTIVITY,
        elementText: "User Activity",
    });

    cy.verifyElement({
        element: analyticsLoyaltySlippingAwayPageElements.TAB_SLIPPING_AWAY,
        elementText: "Slipping Away",
    });

    cy.verifyElement({
        element: analyticsLoyaltySlippingAwayPageElements.TAB_TIMES_OF_DAY,
        elementText: "Times of Day",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsLoyaltySlippingAwayPageElements.EMPTY_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltySlippingAwayPageElements.EMPTY_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsLoyaltySlippingAwayPageElements.EMPTY_PAGE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickUserActivityTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltySlippingAwayPageElements.TAB_USER_ACTIVITY);
};

const clickSlippingAwayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltySlippingAwayPageElements.TAB_SLIPPING_AWAY);
};

const clickTimesOfDayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsLoyaltySlippingAwayPageElements.TAB_TIMES_OF_DAY);
};

module.exports = {
    verifyEmptyPageElements,
    clickUserActivityTab,
    clickSlippingAwayTab,
    clickTimesOfDayTab
};