import {
    carriersPageElements,
    carriersEGraphElements,
    carriersDataTableElements
} from "../../../../support/elements/dashboard/analytics/technology/carriers";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: carriersPageElements.PAGE_TITLE,
        labelText: "Carriers",
        tooltipElement: carriersPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Detailed information on the network carriers of the devices through which your users access your application within the selected time period."
    });

    cy.verifyElement({
        element: carriersPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: carriersPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: carriersPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: carriersPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: carriersPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: carriersPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: carriersPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });

    cy.verifyElement({
        element: carriersDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: carriersDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_CARRIER_LABEL,
        elementText: "Carrier",
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_CARRIER_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: carriersDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyCarriersEGraph({
        isEmpty: true,
    });

    verifyCarriersDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyCarriersEGraph({
        isEmpty: false,
    });

    verifyCarriersDataFromTable({
        isEmpty: false,
    });
};

const verifyCarriersEGraph = ({
    index = 0,
    isEmpty = false
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: carriersEGraphElements().EMPTY_PIE_TOTAL_ICON,
        });

        cy.verifyElement({
            labelElement: carriersEGraphElements().EMPTY_PIE_TOTAL_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: carriersEGraphElements().EMPTY_PIE_TOTAL_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            element: carriersEGraphElements().EMPTY_PIE_NEW_ICON,
        });

        cy.verifyElement({
            labelElement: carriersEGraphElements().EMPTY_PIE_NEW_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: carriersEGraphElements().EMPTY_PIE_NEW_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: carriersEGraphElements().ECHARTS,
    });

    cy.verifyElement({
        element: carriersEGraphElements().CARRIERS_NAMES,
    });

    cy.verifyElement({
        element: carriersEGraphElements().CARRIERS_VALUES,
    });

    cy.verifyElement({
        element: carriersEGraphElements().CARRIERS_ICONS,
    });
};

const verifyCarriersDataFromTable = ({
    index = 0,
    isEmpty = false,
    carrier = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {

        cy.verifyElement({
            element: carriersDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: carriersDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: carriersDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: carriersDataTableElements(index).CARRIER,
        elementText: carrier
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: carriersDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: carriersDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: carriersDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(carriersPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(carriersPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(carriersPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(carriersPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(carriersPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(carriersPageElements.TAB_DENSITIES);
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
    verifyCarriersEGraph,
    verifyCarriersDataFromTable
};