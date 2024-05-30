import analyticsEventsOverviewPageElements from "../../../../support/elements/dashboard/analytics/events/overview";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.PAGE_TITLE,
        labelText: "Events Overview",
        element: analyticsEventsOverviewPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON
    });

    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.PAGE_SUB_TITLE,
        labelText: "Event Metrics",
        tooltipElement: analyticsEventsOverviewPageElements.PAGE_SUB_TITLE_TOOLTIP,
        tooltipText: "Overview of the metrics calculated by the identified Events, in the last 30 days."
    });

    cy.verifyElement({
        element: analyticsEventsOverviewPageElements.EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: analyticsEventsOverviewPageElements.DATATABLE_SEARCH_BUTTON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.MONITOR_EVENTS_LABEL,
        labelText: "Monitor Events",
        tooltipElement: analyticsEventsOverviewPageElements.MONITOR_EVENTS_TOOLTIP,
        tooltipText: "A quick summary of selected Events that you wish to monitor. To select Events that you want to highlight here, please click on 'Configure Events'."
    });

    cy.verifyElement({
        element: analyticsEventsOverviewPageElements.CONFIGURE_EVENTS_BUTTON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.TIME_PERIOD_LABEL,
        labelText: "TIME PERIOD",
    });

    cy.verifyElement({
        element: analyticsEventsOverviewPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: analyticsEventsOverviewPageElements.CONFIGURE_EVENTS_LINK_BUTTON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsEventsOverviewPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsEventsOverviewPageElements.EMPTY_MONITOR_EVENTS_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.EMPTY_MONITOR_EVENTS_TABLE_TITLE,
        labelText: "This application doesn't have any custom events",
    });

    cy.verifyElement({
        labelElement: analyticsEventsOverviewPageElements.EMPTY_MONITOR_EVENTS_TABLE_SUBTITLE,
        labelText: "Log some custom events inside your application's code using the SDKs and visit this section later",
    });
};

module.exports = {
    verifyEmptyPageElements,
};