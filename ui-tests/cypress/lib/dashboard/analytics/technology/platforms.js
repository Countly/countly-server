import {
    platformsPageElements,
    platformsMetricCardElements,
    platformsDataTableElements,
    versionsDataTableElements
} from "../../../../support/elements/dashboard/analytics/technology/platforms";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: platformsPageElements.PAGE_TITLE,
        labelText: "Platforms",
        tooltipElement: platformsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the platforms on which yours users access your application, in the selected time period."
    });

    cy.verifyElement({
        element: platformsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: platformsPageElements.PLATFORMS_FOR_LABEL,
        labelText: "Platforms for",
    });

    cy.verifyElement({
        labelElement: platformsPageElements.PLATFORMS_VERSION_DISTRIBUTION_LABEL,
        labelText: "Platforms version distribution",
    });

    cy.verifyElement({
        element: platformsPageElements.PLATFORMS_FOR_LABEL_COMBOBOX,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: platformsPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: platformsPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: platformsPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: platformsPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: platformsPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: platformsPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });

    cy.verifyElement({
        element: platformsPageElements.TAB_TABLE_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: platformsPageElements.TAB_TABLE_VERSIONS,
        elementText: "Versions",
    });

    clickPlatformsTableTab();

    cy.verifyElement({
        element: platformsPageElements.EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: platformsPageElements.TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_PLATFORMS_LABEL,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_PLATFORMS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: platformsDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });

    clickVersionsTableTab();

    cy.verifyElement({
        element: versionsDataTableElements().PLATFORM_SELECT,
    });

    cy.verifyElement({
        element: versionsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: versionsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_VERSIONS_LABEL,
        elementText: "Versions",
    });

    cy.verifyElement({
        element: versionsDataTableElements().COLUMN_NAME_VERSIONS_SORTABLE_ICON,
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

    verifyPlatformsMetricCard({
        isEmpty: true,
    });

    verifyPlatformsDataFromTable({
        isEmpty: true,
    });

    verifyVersionsDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyPlatformsMetricCard({
        isEmpty: false,
    });

    verifyPlatformsDataFromTable({
        isEmpty: false,
    });

    verifyVersionsDataFromTable({
        isEmpty: false,
    });
};

const verifyPlatformsMetricCard = ({
    index = 0,
    isEmpty = false,
    platformName = null,
    platformNumber = null,
    platformPercentage = null,
    versionName = null,
    versionNumber = null,
    versionPercentage = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            labelElement: platformsMetricCardElements(index).PLATFORMS_FOR_NO_DATA_LABEL,
            labelText: "No data",
        });

        cy.verifyElement({
            labelElement: platformsMetricCardElements(index).VERSION_NO_DATA_LABEL,
            labelText: "No data",
        });
        return;
    }
    cy.verifyElement({
        shouldNot: !isEmpty,
        element: platformsMetricCardElements(index).PLATFORM_NAME,
        elementText: platformName,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: platformsMetricCardElements(index).PLATFORM_NUMBER,
        elementText: platformNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: platformsMetricCardElements(index).PLATFORM_PERCENTAGE,
        elementText: platformPercentage,
    });

    cy.verifyElement({
        element: platformsMetricCardElements(index).BOUNCE_RATE_PROGRESS_CIRCLE,
    });

    for (var i = 0; i < 3; i++) {
        cy.verifyElement({
            shouldNot: !isEmpty,
            element: platformsMetricCardElements(i).VERSION_NAME,
            elementText: versionName,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: platformsMetricCardElements(i).VERSION_NUMBER,
            elementText: versionNumber,
        });

        cy.verifyElement({
            element: platformsMetricCardElements(i).VERSION_DIVIDER,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: platformsMetricCardElements(i).VERSION_PERCENTAGE,
            elementText: versionPercentage,
        });

        cy.verifyElement({
            isElementVisible: false,
            element: platformsMetricCardElements(i).VERSION_PROGRESS_BAR,
        });
    }
};

const verifyPlatformsDataFromTable = ({
    index = 0,
    isEmpty = false,
    platform = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    clickPlatformsTableTab();

    if (isEmpty) {

        cy.verifyElement({
            element: platformsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: platformsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: platformsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: platformsDataTableElements(index).PLATFORMS,
        elementText: platform
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: platformsDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: platformsDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: platformsDataTableElements(index).NEW_USERS,
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
        element: versionsDataTableElements(index).VERSIONS,
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
    cy.clickElement(platformsPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(platformsPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(platformsPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(platformsPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(platformsPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(platformsPageElements.TAB_DENSITIES);
};

const clickPlatformsTableTab = () => {
    cy.clickElement(platformsPageElements.TAB_TABLE_PLATFORMS);
};

const clickVersionsTableTab = () => {
    cy.clickElement(platformsPageElements.TAB_TABLE_VERSIONS);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyPlatformsMetricCard,
    verifyPlatformsDataFromTable,
    verifyVersionsDataFromTable,
    clickPlatformsTab,
    clickDevicesAndTypesTab,
    clickResolutionsTab,
    clickAppVersionsTab,
    clickCarriersTab,
    clickDensitiesTab,
    clickPlatformsTableTab,
    clickVersionsTableTab
};