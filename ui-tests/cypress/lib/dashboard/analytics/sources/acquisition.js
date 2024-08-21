import {
    acquisitionPageElements,
    acquisitionEChartElements,
    acquisitionDataTableElements
} from "../../../../support/elements/dashboard/analytics/acquisition/acquisition";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: acquisitionPageElements.PAGE_TITLE,
        labelText: "Sources",
        tooltipElement: acquisitionPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the source of traffic to your mobile application (where the user discovered the app) or website application (how the user came to your website)."
    });

    cy.verifyElement({
        element: acquisitionPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: acquisitionDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: acquisitionDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: acquisitionDataTableElements().COLUMN_NAME_SOURCE_LABEL,
        labelText: "Source",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: acquisitionDataTableElements().COLUMN_NAME_SOURCE_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: acquisitionDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: acquisitionDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: acquisitionDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        labelText: "Total Users",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: acquisitionDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: acquisitionDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        labelText: "NEW USERS",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: acquisitionDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyAcquisitionChart({
        isEmpty: true,
    });

    verifyAcquisitionDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyAcquisitionChart({
        isEmpty: false,
    });

    verifyAcquisitionDataFromTable({
        isEmpty: false,
    });
};

const verifyAcquisitionChart = ({
    isEmpty = false
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: acquisitionEChartElements.EMPTY_PIE_SOURCES_TOTAL_SESSIONS_ICON,
        });

        cy.verifyElement({
            labelElement: acquisitionEChartElements.EMPTY_PIE_SOURCES_TOTAL_SESSIONS_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: acquisitionEChartElements.EMPTY_PIE_SOURCES_TOTAL_SESSIONS_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            element: acquisitionEChartElements.EMPTY_PIE_SOURCES_NEW_USERS_ICON,
        });

        cy.verifyElement({
            labelElement: acquisitionEChartElements.EMPTY_PIE_SOURCES_NEW_USERS_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: acquisitionEChartElements.EMPTY_PIE_SOURCES_NEW_USERS_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }
    cy.verifyElement({
        element: acquisitionEChartElements.ECHARTS,
    });
};

const verifyAcquisitionDataFromTable = ({
    index = 0,
    isEmpty = false,
    source = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: acquisitionDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: acquisitionDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: acquisitionDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }
        cy.verifyElement({
            element: acquisitionDataTableElements(index).VIEW_CHECKBOX,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: acquisitionDataTableElements(index).SOURCE,
            elementText: source
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: acquisitionDataTableElements(index).TOTAL_SESSIONS,
            elementText: totalSessions
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: acquisitionDataTableElements(index).TOTAL_USERS,
            elementText: totalUsers
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: acquisitionDataTableElements(index).NEW_USERS,
            elementText: newUsers
        });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyAcquisitionChart,
    verifyAcquisitionDataFromTable
};