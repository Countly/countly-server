import {
    sessionFrequencyPageElements,
    sessionFrequencyEChartElements,
    sessionFrequencyDataTableElements
} from "../../../../support/elements/dashboard/analytics/sessions/frequency";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: sessionFrequencyPageElements.PAGE_TITLE,
        labelText: "Session Frequency",
        tooltipElement: sessionFrequencyPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Number of times users open your application, in the selected time period, distributed into frequency ranges."
    });

    cy.verifyElement({
        element: sessionFrequencyPageElements.FILTER_DATE_PICKER
    });

    cy.scrollPageToTop();

    // cy.verifyElement({
    //     element: sessionFrequencyPageElements.TAB_SESSION_OVERVIEW,
    //     elementText: "Session Overview",
    // });

    cy.verifyElement({
        element: sessionFrequencyPageElements.TAB_SESSION_DURATIONS,
        elementText: "Session Durations",
    });

    cy.verifyElement({
        element: sessionFrequencyPageElements.TAB_SESSION_FREQUENCY,
        elementText: "Session Frequency",
    });

    cy.verifyElement({
        element: sessionFrequencyPageElements.TAB_SESSION_VIEWS_PER_SESSION,
        elementText: "Views per Session",
    });

    cy.verifyElement({
        element: sessionFrequencyDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: sessionFrequencyDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: sessionFrequencyDataTableElements().COLUMN_NAME_TIME_SINCE_LAST_SESSION_LABEL,
        isElementVisible: false,
        labelText: "Time since last session",
    });

    cy.verifyElement({
        element: sessionFrequencyDataTableElements().COLUMN_NAME_TIME_SINCE_LAST_SESSION_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sessionFrequencyDataTableElements().COLUMN_NAME_NUMBER_OF_SESSIONS_LABEL,
        isElementVisible: false,
        labelText: "Number of Sessions",
    });

    cy.verifyElement({
        element: sessionFrequencyDataTableElements().COLUMN_NAME_NUMBER_OF_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sessionFrequencyDataTableElements().COLUMN_NAME_PERCENT_LABEL,
        isElementVisible: false,
        labelText: "Percent",
    });

    cy.verifyElement({
        element: sessionFrequencyDataTableElements().COLUMN_NAME_PERCENT_SORTABLE_ICON,
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifySessionFrequencyChart({
        isEmpty: true,
    });

    verifySessionFrequencyDataFromTable({
        isEmpty: true,
    })
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifySessionFrequencyChart({
        isEmpty: false,
    });

    verifySessionFrequencyDataFromTable({
        isEmpty: false,
    })
};

const verifySessionFrequencyChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: sessionFrequencyEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: sessionFrequencyEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sessionFrequencyEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
    } else {

        cy.verifyElement({
            element: sessionFrequencyEChartElements.CHART_SESSION_FREQUENCY,
        });

        cy.verifyElement({
            element: sessionFrequencyEChartElements.CHART_MORE_BUTTON,
        });

        cy.verifyElement({
            element: sessionFrequencyEChartElements.CHART_SESSION_FREQUENCY_ICON,
            labelElement: sessionFrequencyEChartElements.CHART_SESSION_FREQUENCY_LABEL,
            labelText: "Session Frequency",
        });
    }
};

const verifySessionFrequencyDataFromTable = ({
    index = 0,
    isEmpty = false,
    numberOfSessions = null,
    percent = null,
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {
        cy.verifyElement({
            element: sessionFrequencyDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: sessionFrequencyDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sessionFrequencyDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
    } else {

        cy.verifyElement({
            element: sessionFrequencyDataTableElements(0).TIME_SINCE_LAST_SESSION,
            elementText: "First Session"
        });
        cy.verifyElement({
            element: sessionFrequencyDataTableElements(1).TIME_SINCE_LAST_SESSION,
            elementText: "1-24 hours"
        });
        cy.verifyElement({
            element: sessionFrequencyDataTableElements(2).TIME_SINCE_LAST_SESSION,
            elementText: "1 day"
        });

        for (var i = 0; i < 3; i++) {
            cy.verifyElement({
                element: sessionFrequencyDataTableElements(i).PERCENT_PROGRESS_BAR,
            });
        }

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: sessionFrequencyDataTableElements(index).NUMBER_OF_SESSIONS,
            elementText: numberOfSessions
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: sessionFrequencyDataTableElements(index).PERCENT_VALUE,
            elementText: percent
        });
    }
};

const clickSessionOverviewTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionFrequencyPageElements.TAB_SESSION_OVERVIEW);
};

const clickSessionDurationsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionFrequencyPageElements.TAB_SESSION_DURATIONS);
};

const clickSessionFrequencyTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionFrequencyPageElements.TAB_SESSION_FREQUENCY);
};

const clickViewsPerSessionTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionFrequencyPageElements.TAB_SESSION_VIEWS_PER_SESSION);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickSessionOverviewTab,
    clickSessionDurationsTab,
    clickSessionFrequencyTab,
    clickViewsPerSessionTab
};