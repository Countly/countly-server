import analyticsTechnologyPlatformsPageElements from "../../../../support/elements/dashboard/analytics/technology/platforms";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsTechnologyPlatformsPageElements.PAGE_TITLE,
        labelText: "Platforms",
        tooltipElement: analyticsTechnologyPlatformsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the platforms on which yours users access your application, in the selected time period."
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyPlatformsPageElements.PLATFORMS_FOR_LABEL,
        labelText: "Platforms for",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyPlatformsPageElements.PLATFORMS_VERSION_DISTRIBUTION_LABEL,
        labelText: "Platforms version distribution",
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.PLATFORMS_FOR_LABEL_COMBOBOX,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        labelElement: analyticsTechnologyPlatformsPageElements.PLATFORMS_FOR_NO_DATA_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyPlatformsPageElements.PLATFORMS_VERSION_DISTRIBUTION_NO_DATA_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        element: analyticsTechnologyPlatformsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyPlatformsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyPlatformsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyPlatformsPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyPlatformsPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyPlatformsPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyPlatformsPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyPlatformsPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyPlatformsPageElements.TAB_DENSITIES);
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