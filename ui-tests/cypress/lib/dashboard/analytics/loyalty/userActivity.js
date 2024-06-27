import {
    userActivityPageElements,
    userActivityEChartElements,
    userActivityDataTableElements
} from "../../../../support/elements/dashboard/analytics/loyalty/userActivity";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: userActivityPageElements.PAGE_TITLE,
        labelText: "User Activity",
        tooltipElement: userActivityPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the total number of users who started a session on your application, distributed in pre-set categories of numbers of sessions."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: userActivityPageElements.TAB_USER_ACTIVITY,
        elementText: "User Activity",
    });

    cy.verifyElement({
        element: userActivityPageElements.TAB_SLIPPING_AWAY,
        elementText: "Slipping Away",
    });

    cy.verifyElement({
        element: userActivityPageElements.TAB_TIMES_OF_DAY,
        elementText: "Times of Day",
    });

    cy.verifyElement({
        element: userActivityDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: userActivityDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: userActivityDataTableElements().COLUMN_NAME_SESSION_COUNT_LABEL,
        isElementVisible: false,
        labelText: "Session Count (All Time)",
    });

    cy.verifyElement({
        element: userActivityDataTableElements().COLUMN_NAME_SESSION_COUNT_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: userActivityDataTableElements().COLUMN_NAME_ALL_USERS_LABEL,
        isElementVisible: false,
        labelText: "All Users",
    });

    cy.verifyElement({
        element: userActivityDataTableElements().COLUMN_NAME_ALL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: userActivityDataTableElements().COLUMN_NAME_ACTIVE_USERS_THIRTY_DAYS_LABEL,
        isElementVisible: false,
        labelText: "Active Users (30 days)",
    });

    cy.verifyElement({
        element: userActivityDataTableElements().COLUMN_NAME_ACTIVE_USERS_THIRTY_DAYS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: userActivityDataTableElements().COLUMN_NAME_ACTIVE_USERS_SEVEN_DAYS_LABEL,
        isElementVisible: false,
        labelText: "Active Users (7 days)",
    });

    cy.verifyElement({
        element: userActivityDataTableElements().COLUMN_NAME_ACTIVE_USERS_SEVEN_DAYS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyUserActivityChart({
        isEmpty: true,
    });

    verifyUserActivityDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyUserActivityChart({
        isEmpty: false,
    });

    verifyUserActivityDataFromTable({
        isEmpty: false,
    });
};

const verifyUserActivityChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: userActivityEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: userActivityEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: userActivityEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }
    
    cy.verifyElement({
        element: userActivityEChartElements.CHART_USER_ACTIVITY,
    });

    cy.verifyElement({
        element: userActivityEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: userActivityEChartElements.CHART_ALL_USERS_ICON,
        labelElement: userActivityEChartElements.CHART_ALL_USERS_LABEL,
        labelText: "All Users",
    });

    cy.verifyElement({
        element: userActivityEChartElements.CHART_ACTIVE_USERS_SEVEN_DAYS_ICON,
        labelElement: userActivityEChartElements.CHART_ACTIVE_USERS_SEVEN_DAYS_LABEL,
        labelText: "Active Users (7 days)",
    });

    cy.verifyElement({
        element: userActivityEChartElements.CHART_ACTIVE_USERS_THIRTY_DAYS_ICON,
        labelElement: userActivityEChartElements.CHART_ACTIVE_USERS_THIRTY_DAYS_LABEL,
        labelText: "Active Users (30 days)",
    });
};

const verifyUserActivityDataFromTable = ({
    index = 0,
    isEmpty = false,
    sessionCount = null,
    allUsersValue = null,
    allUsersPercentage = null,
    activeUsersThirtyDaysValue = null,
    activeUsersThirtyDaysPercentage = null,
    activeUsersSevenDaysValue = null,
    activeUsersSevenDaysPercentage = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: userActivityDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: userActivityDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: userActivityDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userActivityDataTableElements(index).SESSION_COUNT,
        elementText: sessionCount
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userActivityDataTableElements(index).ALL_USERS_VALUE,
        elementText: allUsersValue
    });

    cy.verifyElement({
        element: userActivityDataTableElements(index).ALL_USERS_DIVIDER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userActivityDataTableElements(index).ALL_USERS_PERCENTAGE,
        elementText: allUsersPercentage
    });

    cy.verifyElement({
        element: userActivityDataTableElements(index).ALL_USERS_PROGRESS_BAR,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userActivityDataTableElements(index).ACTIVE_USERS_THIRTY_DAYS_VALUE,
        elementText: activeUsersThirtyDaysValue
    });

    cy.verifyElement({
        element: userActivityDataTableElements(index).ACTIVE_USERS_THIRTY_DAYS_DIVIDER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userActivityDataTableElements(index).ACTIVE_USERS_THIRTY_DAYS_PERCENTAGE,
        elementText: activeUsersThirtyDaysPercentage
    });

    cy.verifyElement({
        element: userActivityDataTableElements(index).ACTIVE_USERS_THIRTY_DAYS_PROGRESS_BAR,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userActivityDataTableElements(index).ACTIVE_USERS_SEVEN_DAYS_VALUE,
        elementText: activeUsersSevenDaysValue
    });

    cy.verifyElement({
        element: userActivityDataTableElements(index).ACTIVE_USERS_SEVEN_DAYS_DIVIDER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: userActivityDataTableElements(index).ACTIVE_USERS_SEVEN_DAYS_PERCENTAGE,
        elementText: activeUsersSevenDaysPercentage
    });

    cy.verifyElement({
        element: userActivityDataTableElements(index).ACTIVE_USERS_SEVEN_DAYS_PROGRESS_BAR,
    });
};

const clickUserActivityTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(userActivityPageElements.TAB_USER_ACTIVITY);
};

const clickSlippingAwayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(userActivityPageElements.TAB_SLIPPING_AWAY);
};

const clickTimesOfDayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(userActivityPageElements.TAB_TIMES_OF_DAY);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyUserActivityChart,
    verifyUserActivityDataFromTable,
    clickUserActivityTab,
    clickSlippingAwayTab,
    clickTimesOfDayTab
};