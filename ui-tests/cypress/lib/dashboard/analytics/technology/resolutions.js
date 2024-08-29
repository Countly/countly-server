import {
    resolutionsPageElements,
    resolutionsMetricCardElements,
    resolutionsDataTableElements
} from "../../../../support/elements/dashboard/analytics/technology/resolutions";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: resolutionsPageElements.PAGE_TITLE,
        labelText: "Resolutions",
        tooltipElement: resolutionsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Detailed information on the resolution settings of the devices through which your users access your application, in the selected time period."
    });

    cy.verifyElement({
        element: resolutionsPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: resolutionsPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: resolutionsPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: resolutionsPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: resolutionsPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: resolutionsPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: resolutionsPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_RESOLUTION_LABEL,
        elementText: "Resolution",
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_RESOLUTIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: resolutionsDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyResolutionsMetricCard({
        isEmpty: true,
    });

    verifyResolutionsDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyResolutionsMetricCard({
        isEmpty: false,
    });

    verifyResolutionsDataFromTable({
        isEmpty: false,
    });
};

const verifyResolutionsMetricCard = ({
    index = 0,
    isEmpty = false
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: resolutionsMetricCardElements().EMPTY_PIE_TOTAL_ICON,
        });

        cy.verifyElement({
            labelElement: resolutionsMetricCardElements().EMPTY_PIE_TOTAL_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: resolutionsMetricCardElements().EMPTY_PIE_TOTAL_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            element: resolutionsMetricCardElements().EMPTY_PIE_NEW_ICON,
        });

        cy.verifyElement({
            labelElement: resolutionsMetricCardElements().EMPTY_PIE_NEW_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: resolutionsMetricCardElements().EMPTY_PIE_NEW_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: resolutionsMetricCardElements().ECHARTS,
    });

    cy.verifyElement({
        element: resolutionsMetricCardElements().RESOLUTIONS_NAMES,
    });

    cy.verifyElement({
        element: resolutionsMetricCardElements().RESOLUTIONS_VALUES,
    });

    cy.verifyElement({
        element: resolutionsMetricCardElements().RESOLUTIONS_ICONS,
    });
};

const verifyResolutionsDataFromTable = ({
    index = 0,
    isEmpty = false,
    resolution = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {

        cy.verifyElement({
            element: resolutionsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: resolutionsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: resolutionsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: resolutionsDataTableElements(index).RESOLUTION,
        elementText: resolution
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: resolutionsDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: resolutionsDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: resolutionsDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(resolutionsPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(resolutionsPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(resolutionsPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(resolutionsPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(resolutionsPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(resolutionsPageElements.TAB_DENSITIES);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickPlatformsTab,
    clickDevicesAndTypesTab,
    clickResolutionsTab,
    clickAppVersionsTab,
    clickCarriersTab,
    clickDensitiesTab,
    verifyResolutionsMetricCard,
    verifyResolutionsDataFromTable
};