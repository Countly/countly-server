import analyticsTechnologyAppVersionsPageElements from "../../../../support/elements/dashboard/analytics/technology/versions";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsTechnologyAppVersionsPageElements.PAGE_TITLE,
        labelText: "App Versions",
        tooltipElement: analyticsTechnologyAppVersionsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Detailed information on the application versions of your application accessed by your users, in the selected time period."
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyAppVersionsPageElements.APP_VERSIONS_FOR_LABEL,
        labelText: "App versions for",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.APP_VERSIONS_FOR_COMBOBOX,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyAppVersionsPageElements.AS_LABEL,
        labelText: "as",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.AS_VALUE_COMBOBOX,
    });

    cy.scrollPageToTop();
    
    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.EMPTY_CHART_PAGE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyAppVersionsPageElements.EMPTY_CHART_PAGE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyAppVersionsPageElements.EMPTY_CHART_PAGE_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsTechnologyAppVersionsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyAppVersionsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyAppVersionsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickPlatformsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyAppVersionsPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyAppVersionsPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyAppVersionsPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyAppVersionsPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyAppVersionsPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyAppVersionsPageElements.TAB_DENSITIES);
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