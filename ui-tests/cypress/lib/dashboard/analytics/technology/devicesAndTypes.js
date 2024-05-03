import analyticsTechnologyDevicesAndTypesPageElements from "../../../../support/elements/dashboard/analytics/technology/devicesAndTypes";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.PAGE_TITLE,
        labelText: "Devices and Types",
        tooltipElement: analyticsTechnologyDevicesAndTypesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the device models and types from which your users access your application, in the selected time period."
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_DEVICES,
        elementText: "Devices",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_TYPES,
        elementText: "Types",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_DEVICES_TOTAL_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_DEVICES_TOTAL_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_DEVICES_TOTAL_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_DEVICES_NEW_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_DEVICES_NEW_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_DEVICES_NEW_SUBTITLE,
        labelText: "No data found",
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    clickTypesTab();

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_TYPES_TOTAL_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_TYPES_TOTAL_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_TYPES_TOTAL_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_TYPES_NEW_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_TYPES_NEW_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_PIE_TYPES_NEW_SUBTITLE,
        labelText: "No data found",
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        element: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDevicesAndTypesPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    clickDevicesTab();
};

const clickDevicesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_DEVICES);
};

const clickTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_TYPES);
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDevicesAndTypesPageElements.TAB_DENSITIES);
};


module.exports = {
    verifyEmptyPageElements,
    clickDevicesTab,
    clickTypesTab,
    clickPlatformsTab,
    clickDevicesAndTypesTab,
    clickResolutionsTab,
    clickAppVersionsTab,
    clickCarriersTab,
    clickDensitiesTab
};