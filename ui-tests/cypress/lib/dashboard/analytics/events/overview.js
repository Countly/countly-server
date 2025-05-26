import {
    eventsOverviewPageElements,
    eventsOverviewTotalMetricCardElements,
    eventsOverviewTopMetricCardElements,
    eventsOverviewDataTableElements,
    eventsOverviewMonitorEventsMetricCardElements
} from "../../../../support/elements/dashboard/analytics/events/overview";


const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: eventsOverviewPageElements.PAGE_TITLE,
        labelText: "Events Overview",
        element: eventsOverviewPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON
    });

    cy.verifyElement({
        labelElement: eventsOverviewPageElements.PAGE_SUB_TITLE,
        labelText: "Event Metrics",
        tooltipElement: eventsOverviewPageElements.PAGE_SUB_TITLE_TOOLTIP,
        tooltipText: "An overview of the metrics calculated by the identified Events in the last 30 days."
    });

    cy.verifyElement({
        element: eventsOverviewDataTableElements().EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: eventsOverviewDataTableElements().DATATABLE_SEARCH_BUTTON,
    });

    cy.verifyElement({
        element: eventsOverviewDataTableElements().COLUMN_NAME_EVENT_LABEL,
        elementText: "EVENT",
    });

    cy.verifyElement({
        element: eventsOverviewDataTableElements().COLUMN_NAME_COUNT_LABEL,
        elementText: "Count",
    });

    cy.verifyElement({
        element: eventsOverviewDataTableElements().COLUMN_NAME_SUM_LABEL,
        elementText: "Sum",
    });

    cy.verifyElement({
        element: eventsOverviewDataTableElements().COLUMN_NAME_DURATION_LABEL,
        elementText: "Duration",
    });

    cy.verifyElement({
        labelElement: eventsOverviewPageElements.MONITOR_EVENTS_LABEL,
        labelText: "Monitor Events",
        tooltipElement: eventsOverviewPageElements.MONITOR_EVENTS_TOOLTIP,
        tooltipText: "A quick summary of selected Events that you wish to monitor. To select Events that you want to highlight here, please click on 'Configure Events'."
    });

    cy.verifyElement({
        element: eventsOverviewPageElements.CONFIGURE_EVENTS_BUTTON,
    });

    cy.verifyElement({
        labelElement: eventsOverviewPageElements.TIME_PERIOD_LABEL,
        labelText: "TIME PERIOD",
    });

    cy.verifyElement({
        element: eventsOverviewPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: eventsOverviewMonitorEventsMetricCardElements().CONFIGURE_EVENTS_BUTTON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyEventsOverviewTotalMetricCard({
        isEmpty: true,
    });

    verifyEventsOverviewTopMetricCard({
        isEmpty: true,
    });

    verifyEventsOverviewDataFromTable({
        isEmpty: true,
    });

    verifyMonitorEventsMetricCard({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyEventsOverviewTotalMetricCard({
        isEmpty: false,
    });

    verifyEventsOverviewTopMetricCard({
        isEmpty: false,
    });

    verifyEventsOverviewDataFromTable({
        isEmpty: false,
    });

    verifyMonitorEventsMetricCard({
        isEmpty: false,
    });
};

const verifyEventsOverviewTotalMetricCard = ({
    isEmpty = false,
    totalEventNumber = null,
    totalEventPercentage = null,

    eventsPerUserNumber = null,
    eventsPerUserPercentage = null,

    eventsPerSessionNumber = null,
    eventsPerSessionPercentage = null,
}) => {

    cy.scrollPageToTop();

    if (isEmpty) {
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_LABEL);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_TOOLTIP);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_NUMBER);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_LABEL);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_TOOLTIP);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_NUMBER);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_LABEL);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_TOOLTIP);
        cy.shouldNotExist(eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_NUMBER);
        return;
    }

    cy.verifyElement({
        element: eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_LABEL,
        elementText: "Total Event Count",
        tooltipElement: eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_TOOLTIP,
        tooltipText: "Total number of Events triggered in the last 30 days",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_NUMBER,
        elementText: totalEventNumber,
    });

    cy.verifyElement({
        element: eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTotalMetricCardElements.TOTAL_EVENT_COUNT_PERCENTAGE,
        elementText: totalEventPercentage,
    });

    cy.verifyElement({
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_LABEL,
        elementText: "Events Per User",
        tooltipElement: eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_TOOLTIP,
        tooltipText: "Average number of Events triggered per user, in the last 30 days",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_NUMBER,
        elementText: eventsPerUserNumber,
    });

    cy.verifyElement({
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_USER_PERCENTAGE,
        elementText: eventsPerUserPercentage,
    });

    cy.verifyElement({
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_LABEL,
        elementText: "Events Per Session",
        tooltipElement: eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_TOOLTIP,
        tooltipText: "Average number of Events triggered per session, in the last 30 days",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_NUMBER,
        elementText: eventsPerSessionNumber,
    });

    cy.verifyElement({
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTotalMetricCardElements.EVENTS_PER_SESSION_PERCENTAGE,
        elementText: eventsPerSessionPercentage,
    });
};


const verifyEventsOverviewTopMetricCard = ({
    index = 0,
    isEmpty = false,
    eventName = null,
    eventNumber = null,
    eventPercentage = null,
    eventPercentageOfTotal = null
}) => {

    if (isEmpty) {
        cy.shouldNotExist(eventsOverviewTopMetricCardElements(index).EVENT_NAME_LABEL);
        cy.shouldNotExist(eventsOverviewTopMetricCardElements(index).EVENT_NUMBER);
        cy.shouldNotExist(eventsOverviewTopMetricCardElements(index).EVENT_TREND_ICON);
        cy.shouldNotExist(eventsOverviewTopMetricCardElements(index).EVENT_PERCENTAGE);
        cy.shouldNotExist(eventsOverviewTopMetricCardElements(index).EVENT_PERCENTAGE_OF_TOTAL);
        cy.shouldNotExist(eventsOverviewTopMetricCardElements(index).EVENT_PROGRESS_BAR);

        return;
    }

    cy.verifyElement({
        element: eventsOverviewTopMetricCardElements(index).EVENT_NAME_LABEL,
        elementText: eventName,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTopMetricCardElements(index).EVENT_NUMBER,
        elementText: eventNumber,
    });

    cy.verifyElement({
        element: eventsOverviewTopMetricCardElements(index).EVENT_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTopMetricCardElements(index).EVENT_PERCENTAGE,
        elementText: eventPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewTopMetricCardElements(index).EVENT_PERCENTAGE_OF_TOTAL,
        elementText: eventPercentageOfTotal,
    });

    cy.verifyElement({
        element: eventsOverviewTopMetricCardElements(index).EVENT_PROGRESS_BAR,
    });
};

const verifyEventsOverviewDataFromTable = ({
    index = 0,
    isEmpty = false,
    event = null,
    count = null,
    sum = null,
    duration = null,
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: eventsOverviewDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: eventsOverviewDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: eventsOverviewDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewDataTableElements(index).EVENT,
        elementText: event
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewDataTableElements(index).COUNT,
        elementText: count
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewDataTableElements(index).SUM,
        elementText: sum
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewDataTableElements(index).DURATION,
        elementText: duration
    });
};

const verifyMonitorEventsMetricCard = ({
    index = 0,
    isEmpty = false,
    eventName = null,
    eventNumber = null,
    eventPercentage = null,
    eventProperty = null
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {

        cy.verifyElement({
            element: eventsOverviewMonitorEventsMetricCardElements().EMPTY_MONITOR_EVENTS_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: eventsOverviewMonitorEventsMetricCardElements().EMPTY_MONITOR_EVENTS_TABLE_TITLE,
            labelText: "This application does not have any custom events.",
        });

        cy.verifyElement({
            labelElement: eventsOverviewMonitorEventsMetricCardElements().EMPTY_MONITOR_EVENTS_TABLE_SUBTITLE,
            labelText: "Log some custom events inside your application's code using the SDKs and visit this section later",
        });

        cy.verifyElement({
            element: eventsOverviewMonitorEventsMetricCardElements().CONFIGURE_EVENTS_LINK_BUTTON,
        });

        return;
    }

    cy.verifyElement({
        element: eventsOverviewMonitorEventsMetricCardElements(index).MONITOR_EVENT_NAME_LABEL,
        elementText: eventName,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewMonitorEventsMetricCardElements(index).MONITOR_EVENT_NUMBER,
        elementText: eventNumber,
    });

    cy.verifyElement({
        element: eventsOverviewMonitorEventsMetricCardElements(index).MONITOR_EVENT_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewMonitorEventsMetricCardElements(index).MONITOR_EVENT_PROPERTY_NAME_LABEL,
        elementText: eventProperty,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventsOverviewMonitorEventsMetricCardElements(index).MONITOR_EVENT_PERCENTAGE,
        elementText: eventPercentage,
    });

    cy.verifyElement({
        element: eventsOverviewMonitorEventsMetricCardElements(index).MONITOR_EVENT_GRAPH,
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyEventsOverviewTotalMetricCard,
    verifyEventsOverviewTopMetricCard,
    verifyEventsOverviewDataFromTable,
    verifyMonitorEventsMetricCard
};