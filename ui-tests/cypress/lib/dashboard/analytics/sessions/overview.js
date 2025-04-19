import {
    analyticsSessionOverviewPageElements,
    analyticsSessionOverviewEChartElements,
    analyticsSessionOverviewDataTableElements
} from "../../../../support/elements/dashboard/analytics/sessions/overview";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsSessionOverviewPageElements.PAGE_TITLE,
        labelText: "Session Overview",
        tooltipElement: analyticsSessionOverviewPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Summary of all sessions your users have had in your application, in the selected time period."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsSessionOverviewPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: analyticsSessionOverviewDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: analyticsSessionOverviewDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: analyticsSessionOverviewDataTableElements().COLUMN_NAME_DATE_LABEL,
        isElementVisible: false,
        labelText: "Date",
    });

    cy.verifyElement({
        element: analyticsSessionOverviewDataTableElements().COLUMN_NAME_DATE_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSessionOverviewDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        isElementVisible: false,
        labelText: "Total Sessions",
    });

    cy.verifyElement({
        element: analyticsSessionOverviewDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSessionOverviewDataTableElements().COLUMN_NAME_NEW_SESSIONS_LABEL,
        isElementVisible: false,
        labelText: "New Sessions",
    });

    cy.verifyElement({
        element: analyticsSessionOverviewDataTableElements().COLUMN_NAME_NEW_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsSessionOverviewDataTableElements().COLUMN_NAME_UNIQUE_SESSIONS_LABEL,
        isElementVisible: false,
        labelText: "Unique Sessions",
    });

    cy.verifyElement({
        element: analyticsSessionOverviewDataTableElements().COLUMN_NAME_UNIQUE_SESSIONS_SORTABLE_ICON,
    });

    // cy.verifyElement({ TODO: can not see data test id 
    //     element: analyticsSessionsOverviewPageElements.TAB_SESSION_OVERVIEW,
    //     elementText: "Session Overview",
    // });

    cy.verifyElement({
        element: analyticsSessionOverviewPageElements.TAB_SESSION_DURATIONS,
        elementText: "Session Durations",
    });

    cy.verifyElement({
        element: analyticsSessionOverviewPageElements.TAB_SESSION_FREQUENCY,
        elementText: "Session Frequency",
    });

    cy.verifyElement({
        element: analyticsSessionOverviewPageElements.TAB_SESSION_VIEWS_PER_SESSION,
        elementText: "Views per Session",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifySessionsOverviewChart({
        isEmpty: true,
    });

    verifySessionsOverviewDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifySessionsOverviewChart({
        isEmpty: false,
    });

    verifySessionsOverviewDataFromTable({
        isEmpty: false,
    });
};

const verifySessionsOverviewChart = ({
    isEmpty = false,
    totalSessionsValue = null,
    totalSessionsPercentage = null,
    newSessionsValue = null,
    newSessionsPercentage = null,
    uniqueSessionsValue = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: analyticsSessionOverviewEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: analyticsSessionOverviewEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: analyticsSessionOverviewEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_SESSION_OVERVIEW,
    });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_TYPE_SELECT,
        elementPlaceHolder: "Select",
        value: "Line",
    });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_ANNOTATION_BUTTON,
    });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_TOTAL_SESSIONS_ICON,
        labelElement: analyticsSessionOverviewEChartElements.CHART_TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
        tooltipElement: analyticsSessionOverviewEChartElements.CHART_TOTAL_SESSIONS_TOOLTIP,
        tooltipText: "The number of times your application is opened by new or returning users within the selected time period.",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: analyticsSessionOverviewEChartElements.CHART_TOTAL_SESSIONS_VALUE,
        elementText: totalSessionsValue,
    });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_TOTAL_SESSIONS_TREND_ICON,
    });

    // cy.verifyElement({
    //     shouldNot: !isEmpty,
    //     element: analyticsSessionOverviewEChartElements.CHART_TOTAL_SESSIONS_PERCENTAGE,
    //     elementText: totalSessionsPercentage,
    // });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_NEW_SESSIONS_ICON,
        labelElement: analyticsSessionOverviewEChartElements.CHART_NEW_SESSIONS_LABEL,
        labelText: "New Sessions",
        tooltipElement: analyticsSessionOverviewEChartElements.CHART_NEW_SESSIONS_TOOLTIP,
        tooltipText: "The number of times your application is opened by a new user within the selected time period. This is equal to the number of New Users and only counts the user's first session.",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: analyticsSessionOverviewEChartElements.CHART_NEW_SESSIONS_VALUE,
        elementText: newSessionsValue,
    });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_NEW_SESSIONS_TREND_ICON,
    });

    // cy.verifyElement({
    //     shouldNot: !isEmpty,
    //     element: analyticsSessionOverviewEChartElements.CHART_NEW_SESSIONS_PERCENTAGE,
    //     elementText: newSessionsPercentage,
    // });

    cy.verifyElement({
        element: analyticsSessionOverviewEChartElements.CHART_UNIQUE_SESSIONS_ICON,
        labelElement: analyticsSessionOverviewEChartElements.CHART_UNIQUE_SESSIONS_LABEL,
        labelText: "Unique Sessions",
        tooltipElement: analyticsSessionOverviewEChartElements.CHART_UNIQUE_SESSIONS_TOOLTIP,
        tooltipText: "Number of times your application is opened by a new or returning user from a unique device, in the selected time period. It is equal to the number of Total Users.",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: analyticsSessionOverviewEChartElements.CHART_UNIQUE_SESSIONS_VALUE,
        elementText: uniqueSessionsValue,
    });
};

const verifySessionsOverviewDataFromTable = ({
    index = 0,
    isEmpty = false,
    //date = helper.getCurrentMonth(),
    totalUsers = null,
    newUsers = null,
    returningUsers = null
}) => {

    cy.clickElement(analyticsSessionOverviewDataTableElements().COLUMN_NAME_DATE_SORTABLE_ICON);

    cy.verifyElement({
        shouldNot: true,
        element: analyticsSessionOverviewDataTableElements(index).DATE,
        //elementText: date TODO QT-207: if the date is the first day of the month, it is shown as the previous month. exp: for 1 oct it is shown sept 30
        elementText: null
    });

    if (isEmpty) {
        cy.verifyElement({
            element: analyticsSessionOverviewDataTableElements(index).TOTAL_SESSIONS,
            elementText: "0"
        });

        cy.verifyElement({
            element: analyticsSessionOverviewDataTableElements(index).NEW_SESSIONS,
            elementText: "0"
        });

        cy.verifyElement({
            element: analyticsSessionOverviewDataTableElements(index).UNIQUE_SESSIONS,
            elementText: "0"
        });

        return;

    }
    cy.verifyElement({
        shouldNot: !isEmpty,
        element: analyticsSessionOverviewDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: analyticsSessionOverviewDataTableElements(index).NEW_SESSIONS,
        elementText: newUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: analyticsSessionOverviewDataTableElements(index).UNIQUE_SESSIONS,
        elementText: returningUsers
    });
};

const clickSessionOverviewTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionOverviewPageElements.TAB_SESSION_OVERVIEW);
};

const clickSessionDurationsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionOverviewPageElements.TAB_SESSION_DURATIONS);
};

const clickSessionFrequencyTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionOverviewPageElements.TAB_SESSION_FREQUENCY);
};

const clickViewsPerSessionTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsSessionOverviewPageElements.TAB_SESSION_VIEWS_PER_SESSION);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifySessionsOverviewChart,
    verifySessionsOverviewDataFromTable,
    clickSessionOverviewTab,
    clickSessionDurationsTab,
    clickSessionFrequencyTab,
    clickViewsPerSessionTab
};