import {
    sessionDurationsPageElements,
    sessionDurationsEChartElements,
    sessionDurationsDataTableElements
} from "../../../../support/elements/dashboard/analytics/sessions/durations";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: sessionDurationsPageElements.PAGE_TITLE,
        labelText: "Session Durations",
        tooltipElement: sessionDurationsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Time period(s) for which users have opened your application."
    });

    cy.verifyElement({
        element: sessionDurationsPageElements.FILTER_DATE_PICKER
    });

    cy.scrollPageToTop();

    // cy.verifyElement({
    //     element: sessionDurationsPageElements.TAB_SESSION_OVERVIEW,
    //     elementText: "Session Overview",
    // });

    cy.verifyElement({
        element: sessionDurationsPageElements.TAB_SESSION_DURATIONS,
        elementText: "Session Durations",
    });

    cy.verifyElement({
        element: sessionDurationsPageElements.TAB_SESSION_FREQUENCY,
        elementText: "Session Frequency",
    });

    cy.verifyElement({
        element: sessionDurationsPageElements.TAB_SESSION_VIEWS_PER_SESSION,
        elementText: "Views per Session",
    });

    cy.verifyElement({
        element: sessionDurationsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: sessionDurationsDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: sessionDurationsDataTableElements().COLUMN_NAME_SESSION_DURATION_LABEL,
        isElementVisible: false,
        labelText: "Session Duration",
    });

    cy.verifyElement({
        element: sessionDurationsDataTableElements().COLUMN_NAME_SESSION_DURATION_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sessionDurationsDataTableElements().COLUMN_NAME_NUMBER_OF_SESSIONS_LABEL,
        isElementVisible: false,
        labelText: "Number of Sessions",
    });

    cy.verifyElement({
        element: sessionDurationsDataTableElements().COLUMN_NAME_NUMBER_OF_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sessionDurationsDataTableElements().COLUMN_NAME_PERCENT_LABEL,
        isElementVisible: false,
        labelText: "Percent",
    });

    cy.verifyElement({
        element: sessionDurationsDataTableElements().COLUMN_NAME_PERCENT_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifySessionDurationChart({
        isEmpty: true,
    });

    verifySessionDurationDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifySessionDurationChart({
        isEmpty: false,
    });

    verifySessionDurationDataFromTable({
        isEmpty: false,
    });
};

const verifySessionDurationChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: sessionDurationsEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: sessionDurationsEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sessionDurationsEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        element: sessionDurationsEChartElements.CHART_USER_ACTIVITY,
    });

    cy.verifyElement({
        element: sessionDurationsEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: sessionDurationsEChartElements.CHART_SESSION_DURATIONS_ICON,
        labelElement: sessionDurationsEChartElements.CHART_SESSION_DURATIONS_LABEL,
        labelText: "Session Durations",
    });
};

const verifySessionDurationDataFromTable = ({
    index = 0,
    isEmpty = false,
    numberOfSessions = null,
    percent = null,
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {
        cy.verifyElement({
            element: sessionDurationsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: sessionDurationsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sessionDurationsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    let i = 0;

    for (i = 0; i < 5; i++) {
        cy.verifyElement({
            element: sessionDurationsDataTableElements(i).SESSION_DURATION,
        });
    }

    for (i = 0; i < 5; i++) {
        cy.verifyElement({
            element: sessionDurationsDataTableElements(i).PERCENT_PROGRESS_BAR,
        });
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sessionDurationsDataTableElements(index).NUMBER_OF_SESSIONS,
        elementText: numberOfSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sessionDurationsDataTableElements(index).PERCENT_VALUE,
        elementText: percent
    });
};

const clickSessionOverviewTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionDurationsPageElements.TAB_SESSION_OVERVIEW);
};

const clickSessionDurationsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionDurationsPageElements.TAB_SESSION_DURATIONS);
};

const clickSessionFrequencyTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionDurationsPageElements.TAB_SESSION_FREQUENCY);
};

const clickViewsPerSessionTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionDurationsPageElements.TAB_SESSION_VIEWS_PER_SESSION);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickSessionOverviewTab,
    clickSessionDurationsTab,
    clickSessionFrequencyTab,
    clickViewsPerSessionTab
};