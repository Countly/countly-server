import {
    sessionViewsPerSessionElements,
    sessionViewsPerSessionEChartElements,
    sessionViewsPerSessionDataTableElements
} from "../../../../support/elements/dashboard/analytics/sessions/viewsPerSession";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: sessionViewsPerSessionElements.PAGE_TITLE,
        labelText: "Views per Session",
        tooltipElement: sessionViewsPerSessionElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Number of screens or pages that your users viewed in your application, in the selected time period, distributed into frequency ranges."
    });

    cy.verifyElement({
        element: sessionViewsPerSessionElements.FILTER_DATE_PICKER
    });

    cy.scrollPageToTop();

    // cy.verifyElement({
    //     element: sessionViewsPerSessionElements.TAB_SESSION_OVERVIEW,
    //     elementText: "Session Overview",
    // });

    cy.verifyElement({
        element: sessionViewsPerSessionElements.TAB_SESSION_DURATIONS,
        elementText: "Session Durations",
    });

    cy.verifyElement({
        element: sessionViewsPerSessionElements.TAB_SESSION_FREQUENCY,
        elementText: "Session Frequency",
    });

    cy.verifyElement({
        element: sessionViewsPerSessionElements.TAB_SESSION_VIEWS_PER_SESSION,
        elementText: "Views per Session",
    });

    cy.verifyElement({
        element: sessionViewsPerSessionDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: sessionViewsPerSessionDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: sessionViewsPerSessionDataTableElements().COLUMN_NAME_VIEWS_PER_SESSION_LABEL,
        isElementVisible: false,
        labelText: "Views per session",
    });

    cy.verifyElement({
        element: sessionViewsPerSessionDataTableElements().COLUMN_NAME_VIEWS_PER_SESSION_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sessionViewsPerSessionDataTableElements().COLUMN_NAME_NUMBER_OF_SESSIONS_LABEL,
        isElementVisible: false,
        labelText: "Number of Sessions",
    });

    cy.verifyElement({
        element: sessionViewsPerSessionDataTableElements().COLUMN_NAME_NUMBER_OF_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sessionViewsPerSessionDataTableElements().COLUMN_NAME_PERCENT_LABEL,
        isElementVisible: false,
        labelText: "Percent",
    });

    cy.verifyElement({
        element: sessionViewsPerSessionDataTableElements().COLUMN_NAME_PERCENT_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyViewsPerSessionChart({
        isEmpty: true,
    });

    verifyViewsPerSessionDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyViewsPerSessionChart({
        isEmpty: false,
    });

    verifyViewsPerSessionDataFromTable({
        isEmpty: false,
    });
};

const verifyViewsPerSessionChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: sessionViewsPerSessionEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: sessionViewsPerSessionEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sessionViewsPerSessionEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
    }
    else {

        cy.verifyElement({
            element: sessionViewsPerSessionEChartElements.CHART_SESSION_VIEWS_PER_SESSION,
        });

        cy.verifyElement({
            element: sessionViewsPerSessionEChartElements.CHART_MORE_BUTTON,
        });

        cy.verifyElement({
            element: sessionViewsPerSessionEChartElements.CHART_VIEWS_PER_SESSION_ICON,
            labelElement: sessionViewsPerSessionEChartElements.CHART_VIEWS_PER_SESSION_LABEL,
            labelText: "Views per Session",
        });
    }
};

const verifyViewsPerSessionDataFromTable = ({
    index = 0,
    isEmpty = false,
    numberOfSessions = null,
    percent = null,
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {
        cy.verifyElement({
            element: sessionViewsPerSessionDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: sessionViewsPerSessionDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sessionViewsPerSessionDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
    }
    else {

        cy.verifyElement({
            element: sessionViewsPerSessionDataTableElements(0).VIEWS_PER_SESSION,
            elementText: "1 - 2 views"
        });
        cy.verifyElement({
            element: sessionViewsPerSessionDataTableElements(1).VIEWS_PER_SESSION,
            elementText: "3 - 5 views"
        });

        for (var i = 0; i < 2; i++) {
            cy.verifyElement({
                element: sessionViewsPerSessionDataTableElements(i).PERCENT_PROGRESS_BAR,
            });
        }

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: sessionViewsPerSessionDataTableElements(index).NUMBER_OF_SESSIONS,
            elementText: numberOfSessions
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: sessionViewsPerSessionDataTableElements(index).PERCENT_VALUE,
            elementText: percent
        });
    }
};

const clickSessionOverviewTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionViewsPerSessionElements.TAB_SESSION_OVERVIEW);
};

const clickSessionDurationsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionViewsPerSessionElements.TAB_SESSION_DURATIONS);
};

const clickSessionFrequencyTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionViewsPerSessionElements.TAB_SESSION_FREQUENCY);
};

const clickViewsPerSessionTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sessionViewsPerSessionElements.TAB_SESSION_VIEWS_PER_SESSION);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickSessionOverviewTab,
    clickSessionDurationsTab,
    clickSessionFrequencyTab,
    clickViewsPerSessionTab
};