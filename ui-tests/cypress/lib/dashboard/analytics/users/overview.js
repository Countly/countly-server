import {
    usersOverviewPageElements,
    usersOverviewEChartElements,
    usersOverviewDataTableElements
} from "../../../../support/elements/dashboard/analytics/users/overview";
const helper = require('../../../../support/helper');

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: usersOverviewPageElements.PAGE_TITLE,
        labelText: "Users Overview",
        tooltipElement: usersOverviewPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the main metrics and stats about your audience."
    });

    cy.verifyElement({
        element: usersOverviewPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: usersOverviewDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: usersOverviewDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: usersOverviewDataTableElements().COLUMN_NAME_DATE_LABEL,
        isElementVisible: false,
        labelText: "Date",
    });

    cy.verifyElement({
        element: usersOverviewDataTableElements().COLUMN_NAME_DATE_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersOverviewDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        isElementVisible: false,
        labelText: "TOTAL USERS",
    });

    cy.verifyElement({
        element: usersOverviewDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersOverviewDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        isElementVisible: false,
        labelText: "NEW USERS",
    });

    cy.verifyElement({
        element: usersOverviewDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersOverviewDataTableElements().COLUMN_NAME_RETURNING_USERS_LABEL,
        isElementVisible: false,
        labelText: "RETURNING USERS",
    });

    cy.verifyElement({
        element: usersOverviewDataTableElements().COLUMN_NAME_RETURNING_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyUsersOverviewChart({
        isEmpty: true,
    });

    verifyUsersOverviewDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyUsersOverviewChart({
        isEmpty: false,
    });

    verifyUsersOverviewDataFromTable({
        isEmpty: false,
    });
};

const verifyUsersOverviewChart = ({
    isEmpty = false,
    totalUsersValue = null,
    totalUsersPercentage = null,
    newUsersValue = null,
    newUsersPercentage = null,
    returningUsersValue = null,
    returningUsersPercentage = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: usersOverviewEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: usersOverviewEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: usersOverviewEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_USERS_OVERVIEW,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_TYPE_SELECT,
        elementPlaceHolder: "Select",
        value: "Line",
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_ANNOTATION_BUTTON,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_TOTAL_USERS_ICON,
        labelElement: usersOverviewEChartElements.CHART_TOTAL_USERS_LABEL,
        labelText: "Total Users",
        tooltipElement: usersOverviewEChartElements.CHART_TOTAL_USERS_TOOLTIP,
        tooltipText: "The number of users (unique devices/IDs) who have opened your application within the selected time period.",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewEChartElements.CHART_TOTAL_USERS_VALUE,
        elementText: totalUsersValue,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_TOTAL_USERS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewEChartElements.CHART_TOTAL_USERS_PERCENTAGE,
        elementText: totalUsersPercentage,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_NEW_USERS_ICON,
        labelElement: usersOverviewEChartElements.CHART_NEW_USERS_LABEL,
        labelText: "New Users",
        tooltipElement: usersOverviewEChartElements.CHART_NEW_USERS_TOOLTIP,
        tooltipText: "The number of first-time users (unique devices/IDs) within the selected time period.",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewEChartElements.CHART_NEW_USERS_VALUE,
        elementText: newUsersValue,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_NEW_USERS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewEChartElements.CHART_NEW_USERS_PERCENTAGE,
        elementText: newUsersPercentage,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_RETURNING_USERS_ICON,
        labelElement: usersOverviewEChartElements.CHART_RETURNING_USERS_LABEL,
        labelText: "Returning Users",
        tooltipElement: usersOverviewEChartElements.CHART_RETURNING_USERS_TOOLTIP,
        tooltipText: "The number of users using your application for the second or later time within the selected time period, calculated as Total Users minus New Users.",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewEChartElements.CHART_RETURNING_USERS_VALUE,
        elementText: returningUsersValue,
    });

    cy.verifyElement({
        element: usersOverviewEChartElements.CHART_RETURNING_USERS_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewEChartElements.CHART_RETURNING_USERS_PERCENTAGE,
        elementText: returningUsersPercentage,
    });
};

const verifyUsersOverviewDataFromTable = ({
    index = 0,
    isEmpty = false,
    date = helper.getCurrentMonth(),
    totalUsers = null,
    newUsers = null,
    returningUsers = null
}) => {

    cy.clickElement(usersOverviewDataTableElements().COLUMN_NAME_DATE_SORTABLE_ICON);

    cy.verifyElement({
        element: usersOverviewDataTableElements(index).DATE,
        elementText: date
    });

    if (isEmpty) {

        let i = 0;
        cy.scrollPageToBottom();

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: usersOverviewDataTableElements(i).TOTAL_USERS,
                elementText: '0'
            });
        }

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: usersOverviewDataTableElements(i).NEW_USERS,
                elementText: '0'
            });
        }

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: usersOverviewDataTableElements(i).RETURNING_USERS,
                elementText: '0'
            });
        }
        return;
    }
    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewDataTableElements(index).RETURNING_USERS,
        elementText: returningUsers
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyUsersOverviewChart,
    verifyUsersOverviewDataFromTable
};