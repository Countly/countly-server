import {
    devicesAndTypesPageElements,
    devicesEGraphElements,
    devicesDataTableElements,
    typesEGraphElements,
    typesDataTableElements
} from "../../../../support/elements/dashboard/analytics/technology/devicesAndTypes";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: devicesAndTypesPageElements.PAGE_TITLE,
        labelText: "Devices and Types",
        tooltipElement: devicesAndTypesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the device models and types from which your users access your application, in the selected time period."
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_DEVICES,
        elementText: "Devices",
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_TYPES,
        elementText: "Types",
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: devicesAndTypesPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });

    clickDevicesTab();

    cy.verifyElement({
        labelElement: devicesEGraphElements().TOP_PLATFORMS_LABEL,
        labelText: "Top Platforms",
        tooltipElement: devicesEGraphElements().TOP_PLATFORMS_TOOLTIP,
        tooltipText: "Top 5 versions of the platforms of your users’ sessions, in the selected time period."
    });

    cy.verifyElement({
        labelElement: devicesEGraphElements().TOP_PLATFORMS_VERSIONS_LABEL,
        labelText: "Top Platform Versions",
        tooltipElement: devicesEGraphElements().TOP_PLATFORMS_VERSIONS_TOOLTIP,
        tooltipText: "Top 3 versions of the platforms of your users' sessions, in the selected time period."
    });

    cy.verifyElement({
        labelElement: devicesEGraphElements().TOP_RESOLUTIONS_LABEL,
        labelText: "Top Resolutions",
        tooltipElement: devicesEGraphElements().TOP_RESOLUTIONS_TOOLTIP,
        tooltipText: "Top 5 resolution settings of the devices used your users' sessions, in the selected time period."
    });

    cy.verifyElement({
        element: devicesDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: devicesDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_DEVICE_LABEL,
        elementText: "Device",
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_DEVICE_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: devicesDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });

    clickTypesTab();

    cy.verifyElement({
        element: typesDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: typesDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_DEVICE_TYPE_LABEL,
        elementText: "Device Type",
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_DEVICE_TYPE_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: typesDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });

    clickDevicesTab();
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyDevicesEGraph({
        isEmpty: true,
    });

    verifyDevicesDataFromTable({
        isEmpty: true,
    });

    verifyTypesEGraph({
        isEmpty: true,
    });

    verifyTypesDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyDevicesEGraph({
        isEmpty: false,
    });

    verifyDevicesDataFromTable({
        isEmpty: false,
    });

    verifyTypesEGraph({
        isEmpty: false,
    });

    verifyTypesDataFromTable({
        isEmpty: false,
    });
};

const verifyDevicesEGraph = ({
    index = 0,
    isEmpty = false,
    platformName = null,
    platformPercentage = null,
    platformVersion = null,
    platformVersionPercentage = null,
    platformResolution = null,
    platformResolutionPercentage = null
}) => {

    clickDevicesTab();

    if (isEmpty) {

        cy.verifyElement({
            element: devicesEGraphElements().EMPTY_PIE_DEVICES_TOTAL_ICON,
        });

        cy.verifyElement({
            labelElement: devicesEGraphElements().EMPTY_PIE_DEVICES_TOTAL_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: devicesEGraphElements().EMPTY_PIE_DEVICES_TOTAL_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            element: devicesEGraphElements().EMPTY_PIE_DEVICES_NEW_ICON,
        });

        cy.verifyElement({
            labelElement: devicesEGraphElements().EMPTY_PIE_DEVICES_NEW_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: devicesEGraphElements().EMPTY_PIE_DEVICES_NEW_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: devicesEGraphElements().ECHARTS,
    });

    cy.verifyElement({
        element: devicesEGraphElements().DEVICES_NAMES,
    });

    cy.verifyElement({
        element: devicesEGraphElements().DEVICES_VALUES,
    });

    cy.verifyElement({
        element: devicesEGraphElements().DEVICES_ICONS,
    });

    for (var i = 0; i < 3; i++) {
        cy.verifyElement({
            shouldNot: !isEmpty,
            element: devicesEGraphElements(i).TOP_PLATFORMS_NAME,
            elementText: platformName,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: devicesEGraphElements(i).TOP_PLATFORMS_PERCENT,
            elementText: platformPercentage,
        });

        cy.verifyElement({
            isElementVisible: false,
            element: devicesEGraphElements(i).TOP_PLATFORMS_PROGRESS_BAR,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: devicesEGraphElements(i).TOP_PLATFORMS_VERSIONS_NAME,
            elementText: platformVersion,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: devicesEGraphElements(i).TOP_PLATFORMS_VERSIONS_PERCENT,
            elementText: platformVersionPercentage,
        });

        cy.verifyElement({
            isElementVisible: false,
            element: devicesEGraphElements(i).TOP_PLATFORMS_VERSIONS_PROGRESS_BAR,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: devicesEGraphElements(i).TOP_RESOLUTIONS_NAME,
            elementText: platformResolution,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: devicesEGraphElements(i).TOP_RESOLUTIONS_PERCENT,
            elementText: platformResolutionPercentage,
        });

        cy.verifyElement({
            isElementVisible: false,
            element: devicesEGraphElements(i).TOP_RESOLUTIONS_PROGRESS_BAR,
        });
    }
};

const verifyTypesEGraph = ({
    index = 0,
    isEmpty = false
}) => {

    clickTypesTab();

    if (isEmpty) {

        cy.verifyElement({
            element: typesEGraphElements().EMPTY_PIE_TYPES_TOTAL_ICON,
        });

        cy.verifyElement({
            labelElement: typesEGraphElements().EMPTY_PIE_TYPES_TOTAL_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: typesEGraphElements().EMPTY_PIE_TYPES_TOTAL_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            element: typesEGraphElements().EMPTY_PIE_TYPES_NEW_ICON,
        });

        cy.verifyElement({
            labelElement: typesEGraphElements().EMPTY_PIE_TYPES_NEW_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: typesEGraphElements().EMPTY_PIE_TYPES_NEW_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: devicesEGraphElements().ECHARTS,
    });

    cy.verifyElement({
        element: devicesEGraphElements().DEVICES_NAMES,
    });

    cy.verifyElement({
        element: devicesEGraphElements().DEVICES_VALUES,
    });

    cy.verifyElement({
        element: devicesEGraphElements().DEVICES_ICONS,
    });
};

const verifyDevicesDataFromTable = ({
    index = 0,
    isEmpty = false,
    device = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    clickDevicesTab();

    cy.scrollPageToBottom();

    if (isEmpty) {

        cy.verifyElement({
            element: devicesDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: devicesDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: devicesDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: devicesDataTableElements(index).DEVICE,
        elementText: device
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: devicesDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: devicesDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: devicesDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const verifyTypesDataFromTable = ({
    index = 0,
    isEmpty = false,
    deviceType = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    clickTypesTab();

    cy.scrollPageToBottom();

    if (isEmpty) {

        cy.verifyElement({
            element: typesDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: typesDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: typesDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: typesDataTableElements(index).DEVICE_TYPE,
        elementText: deviceType
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: typesDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: typesDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: typesDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const clickDevicesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_DEVICES);
};

const clickTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_TYPES);
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(devicesAndTypesPageElements.TAB_DENSITIES);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickDevicesTab,
    clickTypesTab,
    clickPlatformsTab,
    clickDevicesAndTypesTab,
    clickResolutionsTab,
    clickAppVersionsTab,
    clickCarriersTab,
    clickDensitiesTab,
    verifyDevicesEGraph,
    verifyDevicesDataFromTable,
    verifyTypesEGraph,
    verifyTypesDataFromTable
};