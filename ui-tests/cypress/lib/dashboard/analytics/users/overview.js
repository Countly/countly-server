import {
    usersOverviewPageElements,
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
            element: usersOverviewPageElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: usersOverviewPageElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: usersOverviewPageElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
    }
    else {
        cy.verifyElement({
            element: usersOverviewPageElements.CHART_USERS_OVERVIEW,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_TYPE_SELECT,
            elementPlaceHolder: "Select",
            value: "Line",
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_ANNOTATION_BUTTON,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_MORE_BUTTON,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_TOTAL_USERS_ICON,
            labelElement: usersOverviewPageElements.CHART_TOTAL_USERS_LABEL,
            labelText: "Total Users",
            tooltipElement: usersOverviewPageElements.CHART_TOTAL_USERS_TOOLTIP,
            tooltipText: "The number of users (unique devices/IDs) who have opened your application in the selected time period.",
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: usersOverviewPageElements.CHART_TOTAL_USERS_VALUE,
            elementText: totalUsersValue,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_TOTAL_USERS_TREND_ICON,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: usersOverviewPageElements.CHART_TOTAL_USERS_PERCENTAGE,
            elementText: totalUsersPercentage,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_NEW_USERS_ICON,
            labelElement: usersOverviewPageElements.CHART_NEW_USERS_LABEL,
            labelText: "New Users",
            tooltipElement: usersOverviewPageElements.CHART_NEW_USERS_TOOLTIP,
            tooltipText: "The number of first-time users (unique devices/IDs) in the selected time period.",
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: usersOverviewPageElements.CHART_NEW_USERS_VALUE,
            elementText: newUsersValue,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_NEW_USERS_TREND_ICON,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: usersOverviewPageElements.CHART_NEW_USERS_PERCENTAGE,
            elementText: newUsersPercentage,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_RETURNING_USERS_ICON,
            labelElement: usersOverviewPageElements.CHART_RETURNING_USERS_LABEL,
            labelText: "Returning Users",
            tooltipElement: usersOverviewPageElements.CHART_RETURNING_USERS_TOOLTIP,
            tooltipText: "Number of users using your application for the second or later time, in the selected time period, calculated as Total Users (less) New Users.",
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: usersOverviewPageElements.CHART_RETURNING_USERS_VALUE,
            elementText: returningUsersValue,
        });

        cy.verifyElement({
            element: usersOverviewPageElements.CHART_RETURNING_USERS_TREND_ICON,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: usersOverviewPageElements.CHART_RETURNING_USERS_PERCENTAGE,
            elementText: returningUsersPercentage,
        });
    }
};

const verifyUsersOverviewDataFromTable = ({
    index = 0,
    isEmpty = false,
    date = helper.getCurrentMonth(),
    totalUsers = null,
    newUsers = null,
    returningUsers = null
}) => {

    cy.verifyElement({
        element: usersOverviewDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: usersOverviewDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: usersOverviewDataTableElements(index).COLUMN_NAME_DATE_LABEL,
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

    cy.verifyElement({
        element: usersOverviewDataTableElements().DATE,
        elementText: date
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewDataTableElements().TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewDataTableElements().NEW_USERS,
        elementText: newUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: usersOverviewDataTableElements().RETURNING_USERS,
        elementText: returningUsers
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyUsersOverviewChart,
    verifyUsersOverviewDataFromTable
};