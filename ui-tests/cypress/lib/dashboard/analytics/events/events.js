import analyticsEventsPageElements from "../../../../support/elements/dashboard/analytics/events/events";

const verifyStaticElementsOfEventStatsPage = () => {
    cy.verifyElement({
        labelElement: analyticsEventsPageElements.PAGE_TITLE,
        labelText: "All Events"
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.PERIOD_LABEL,
        labelText: "PERIOD"
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsEventsPageElements.TAB_EVENT_STATS,
        elementText: "Event Stats",
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.TAB_COMPARE_EVENTS,
        elementText: "Compare Events",
    });
};

const verifyStaticElementsOfCompareEventsPage = () => {
    cy.verifyElement({
        labelElement: analyticsEventsPageElements.PAGE_TITLE,
        labelText: "Compare Events"
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.COMPARE_BUTTON,
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.RESULTS_BY_LABEL,
        labelText: "Results by"
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.COUNT_BUTTON,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsEventsPageElements.TAB_EVENT_STATS,
        elementText: "Event Stats",
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.TAB_COMPARE_EVENTS,
        elementText: "Compare Events",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfEventStatsPage();

    cy.verifyElement({
        element: analyticsEventsPageElements.LIST_BOX_SEARCH_INPUT,
        elementPlaceHolder: "Search in 0 Events",
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.LIST_BOX_NO_MATCH_FOUND_LABEL,
        labelText: "No match found",
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.EMPTY_CHART_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_CHART_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_CHART_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.EMPTY_DATATABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_DATATABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_DATATABLE_SUBTITLE,
        labelText: "No data found",
    });

    clickCompareEventsTab();

    verifyStaticElementsOfCompareEventsPage();

    cy.verifyElement({
        element: analyticsEventsPageElements.EMPTY_CHART_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_CHART_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_CHART_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsEventsPageElements.EMPTY_DATATABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_DATATABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsEventsPageElements.EMPTY_DATATABLE_SUBTITLE,
        labelText: "No data found",
    });

};

const clickEventStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsEventsPageElements.TAB_EVENT_STATS);
};

const clickCompareEventsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsEventsPageElements.TAB_COMPARE_EVENTS);
};

module.exports = {
    verifyEmptyPageElements,
    clickEventStatsTab,
    clickCompareEventsTab
};