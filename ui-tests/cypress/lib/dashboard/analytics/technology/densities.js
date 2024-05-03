import analyticsTechnologyDensitiesPageElements from "../../../../support/elements/dashboard/analytics/technology/densities";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsTechnologyDensitiesPageElements.PAGE_TITLE,
        labelText: "Densities",
        tooltipElement: analyticsTechnologyDensitiesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the display densities of the devices from which your users access your application, based on their pixel ratios, in the selected time period."
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDensitiesPageElements.DENSITIES_FOR_LABEL,
        labelText: "Densities for",
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.DENSITIES_FOR_COMBOBOX,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDensitiesPageElements.DENSITIES_DISTRIBUTION_LABEL,
        labelText: "Density Distribution",
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        labelElement: analyticsTechnologyDensitiesPageElements.DENSITIES_FOR_NO_DATA_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDensitiesPageElements.DENSITIES_DISTRIBUTION_NO_DATA_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        element: analyticsTechnologyDensitiesPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDensitiesPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyDensitiesPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDensitiesPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDensitiesPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDensitiesPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDensitiesPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDensitiesPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyDensitiesPageElements.TAB_DENSITIES);
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