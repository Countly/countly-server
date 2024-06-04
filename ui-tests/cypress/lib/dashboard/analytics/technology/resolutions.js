import analyticsTechnologyResolutionsPageElements from "../../../../support/elements/dashboard/analytics/technology/resolutions";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsTechnologyResolutionsPageElements.PAGE_TITLE,
        labelText: "Resolutions",
        tooltipElement: analyticsTechnologyResolutionsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Detailed information on the resolution settings of the devices through which your users access your application, in the selected time period."
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.EMPTY_PIE_NEW_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyResolutionsPageElements.EMPTY_PIE_NEW_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyResolutionsPageElements.EMPTY_PIE_NEW_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.EMPTY_PIE_TOTAL_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyResolutionsPageElements.EMPTY_PIE_TOTAL_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyResolutionsPageElements.EMPTY_PIE_TOTAL_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsTechnologyResolutionsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyResolutionsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyResolutionsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyResolutionsPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyResolutionsPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyResolutionsPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyResolutionsPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyResolutionsPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyResolutionsPageElements.TAB_DENSITIES);
};

module.exports = {
    verifyEmptyPageElements,
    clickPlatformsTab,
    clickDevicesAndTypesTab,
    clickResolutionsTab,
    clickAppVersionsTab,
    clickCarriersTab,
    clickDensitiesTab
};