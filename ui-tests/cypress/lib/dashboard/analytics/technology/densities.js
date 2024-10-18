import {
    densitiesPageElements,
    densitiesMetricCardElements,
    densitiesDataTableElements,
    versionsDataTableElements
} from "../../../../support/elements/dashboard/analytics/technology/densities";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: densitiesPageElements.PAGE_TITLE,
        labelText: "Densities",
        tooltipElement: densitiesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the display densities of the devices from which your users access your application, based on their pixel ratios, in the selected time period."
    });

    cy.verifyElement({
        element: densitiesPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: densitiesPageElements.DENSITIES_FOR_LABEL,
        labelText: "Densities for",
    });

    cy.verifyElement({
        element: densitiesPageElements.DENSITIES_FOR_COMBOBOX,
    });

    cy.verifyElement({
        labelElement: densitiesPageElements.DENSITIES_DISTRIBUTION_LABEL,
        labelText: "Density Distribution",
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: densitiesPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: densitiesPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: densitiesPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: densitiesPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: densitiesPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: densitiesPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });

    cy.verifyElement({
        element: densitiesPageElements.TAB_TABLE_DENSITIES,
        elementText: "Densities",
    });

    cy.verifyElement({
        element: densitiesPageElements.TAB_TABLE_VERSIONS,
        elementText: "Versions",
    });

    clickDensitiesTableTab();

    cy.verifyElement({
        element: densitiesDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: densitiesDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_DENSITY_LABEL,
        elementText: "Density",
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_DENSITY_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: densitiesDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });

    clickVersionsTableTab();

    cy.verifyElement({
        element: versionsDataTableElements().DESTINY_SELECT,
    });

    cy.verifyElement({
        element: versionsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: versionsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_DENSITY_VERSION_LABEL,
        elementText: "Density Version",
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_DENSITY_VERSION_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyDensitiesMetricCard({
        isEmpty: true,
    });

    verifyDensitiesDataFromTable({
        isEmpty: true,
    });

    verifyVersionsDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyDensitiesMetricCard({
        isEmpty: false,
    });

    verifyDensitiesDataFromTable({
        isEmpty: false,
    });

    verifyVersionsDataFromTable({
        isEmpty: false,
    });
};

const verifyDensitiesMetricCard = ({
    index = 0,
    isEmpty = false,
    destinyName = null,
    destinyNumber = null,
    destinyPercentage = null,
    versionName = null,
    versionNumber = null,
    versionPercentage = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            labelElement: densitiesMetricCardElements(index).DENSITIES_FOR_NO_DATA_LABEL,
            labelText: "No data",
        });

        cy.verifyElement({
            labelElement: densitiesMetricCardElements(index).VERSION_NO_DATA_LABEL,
            labelText: "No data",
        });
        return;
    }
    cy.verifyElement({
        shouldNot: !isEmpty,
        element: densitiesMetricCardElements(index).DESTINY_NAME,
        elementText: destinyName,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: densitiesMetricCardElements(index).DESTINY_NUMBER,
        elementText: destinyNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: densitiesMetricCardElements(index).DESTINY_PERCENTAGE,
        elementText: destinyPercentage,
    });

    cy.verifyElement({
        element: densitiesMetricCardElements(index).BOUNCE_RATE_PROGRESS_CIRCLE,
    });

    // TODO: Ooen that part after https://countly.atlassian.net/browse/SER-1791 Fixed 
    // for (var i = 0; i < 3; i++) {
    //     cy.verifyElement({
    //         shouldNot: !isEmpty,
    //         element: densitiesMetricCardElements(i).VERSION_NAME,
    //         elementText: versionName,
    //     });

    //     cy.verifyElement({
    //         shouldNot: !isEmpty,
    //         element: densitiesMetricCardElements(i).VERSION_NUMBER,
    //         elementText: versionNumber,
    //     });

    //     cy.verifyElement({
    //         element: densitiesMetricCardElements(i).VERSION_DIVIDER,
    //     });

    //     cy.verifyElement({
    //         shouldNot: !isEmpty,
    //         element: densitiesMetricCardElements(i).VERSION_PERCENTAGE,
    //         elementText: versionPercentage,
    //     });

    //     cy.verifyElement({
    //         isElementVisible: false,
    //         element: densitiesMetricCardElements(i).VERSION_PROGRESS_BAR,
    //     });
    // }
};

const verifyDensitiesDataFromTable = ({
    index = 0,
    isEmpty = false,
    destiny = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    clickDensitiesTableTab();

    if (isEmpty) {

        cy.verifyElement({
            element: densitiesDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: densitiesDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: densitiesDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: densitiesDataTableElements(index).DENSITY,
        elementText: destiny
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: densitiesDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: densitiesDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: densitiesDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const verifyVersionsDataFromTable = ({
    index = 0,
    isEmpty = false,
    version = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    clickVersionsTableTab();

    if (isEmpty) {

        cy.verifyElement({
            element: versionsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: versionsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: versionsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: versionsDataTableElements(index).DENSITY_VERSION,
        elementText: version
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: versionsDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: versionsDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: versionsDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(densitiesPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(densitiesPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(densitiesPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(densitiesPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(densitiesPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(densitiesPageElements.TAB_DENSITIES);
};

const clickDensitiesTableTab = () => {
    cy.clickElement(densitiesPageElements.TAB_TABLE_DENSITIES);
};

const clickVersionsTableTab = () => {
    cy.clickElement(densitiesPageElements.TAB_TABLE_VERSIONS);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyDensitiesMetricCard,
    verifyDensitiesDataFromTable,
    verifyVersionsDataFromTable,
    clickPlatformsTab,
    clickDevicesAndTypesTab,
    clickResolutionsTab,
    clickAppVersionsTab,
    clickCarriersTab,
    clickDensitiesTab,
    clickDensitiesTableTab,
    clickVersionsTableTab,

};