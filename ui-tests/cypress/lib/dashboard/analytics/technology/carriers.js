import analyticsTechnologyCarriersPageElements from "../../../../support/elements/dashboard/analytics/technology/carriers";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsTechnologyCarriersPageElements.PAGE_TITLE,
        labelText: "Carriers",
        tooltipElement: analyticsTechnologyCarriersPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Detailed information on the network carriers of the devices through which your users access your application, in the selected time period."
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.EMPTY_PIE_NEW_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyCarriersPageElements.EMPTY_PIE_NEW_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyCarriersPageElements.EMPTY_PIE_NEW_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.EMPTY_PIE_TOTAL_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyCarriersPageElements.EMPTY_PIE_TOTAL_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyCarriersPageElements.EMPTY_PIE_TOTAL_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsTechnologyCarriersPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyCarriersPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyCarriersPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyCarriersPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyCarriersPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyCarriersPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyCarriersPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyCarriersPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyCarriersPageElements.TAB_DENSITIES);
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