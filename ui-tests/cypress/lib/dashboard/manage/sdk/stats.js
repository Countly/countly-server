import sdkStatsPageElements from "../../../../support/elements/dashboard/manage/sdk/stats";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: sdkStatsPageElements.PAGE_TITLE,
        labelText: "SDK stats",
    });

    cy.scrollPageToTop();
    
    cy.verifyElement({
        element: sdkStatsPageElements.TAB_SDK_STATS,
        elementText: "SDK Stats",
    });

    cy.verifyElement({
        element: sdkStatsPageElements.TAB_REQUEST_STATS,
        elementText: "Request Stats",
    });

    cy.verifyElement({
        element: sdkStatsPageElements.TAB_HEALTH_CHECK,
        elementText: "Health Check",
    });

    cy.verifyElement({
        element: sdkStatsPageElements.TAB_SDK_CONFIGURATION,
        elementText: "SDK Configuration",
    });

    cy.verifyElement({
        element: sdkStatsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.STATS_FOR_LABEL,
        labelText: "Stats for",
        element: sdkStatsPageElements.STATS_FOR_SELECT,
        elementText: "Total Users",
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_DISTRIBUTION_LABEL,
        labelText: "SDK Version Distribution",
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_ADOPTION_FOR_LABEL,
        labelText: "SDK Version Adoption for",
        element: sdkStatsPageElements.SDK_VERSION_ADOPTION_FOR_ADOPTION_FOR_SELECT,
        elementPlaceHolder: "Select",
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_ADOPTION_FOR_ADOPTION_FOR_AS_LABEL,
        labelText: "as",
        element: sdkStatsPageElements.SDK_VERSION_ADOPTION_FOR_ADOPTION_FOR_AS_TYPE_SELECT,
        elementText: "percentage",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        labelElement: sdkStatsPageElements.STATS_FOR_TABLE_NO_DATA_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_DISTRIBUTION_TABLE_NO_DATA_LABEL,
        labelText: "No data",
    });

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_VERSION_ADOPTION_FOR_EMPTY_CHART_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_ADOPTION_FOR_EMPTY_CHART_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_ADOPTION_FOR_EMPTY_CHART_SUBTITLE,
        labelText: "No data found",
    });

    clickSDKsTab();

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });


    clickSdkVersionsTab();

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_VERSIONS_TABLE_SELECT,
    });

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_VERSIONS_TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_VERSIONS_TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: sdkStatsPageElements.SDK_VERSION_EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: sdkStatsPageElements.SDK_VERSION_EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickSDKsTab = () => {
    cy.clickElement(sdkStatsPageElements.TAB_SDK_S);
};

const clickSdkVersionsTab = () => {
    cy.clickElement(sdkStatsPageElements.TAB_SDK_VERSIONS);
};

const clickSdkStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkStatsPageElements.TAB_SDK_STATS);
};

const clickRequestStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkStatsPageElements.TAB_REQUEST_STATS);
};

const clickHealthCheckTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkStatsPageElements.TAB_HEALTH_CHECK);
};

const clickSdkConfigurationTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkStatsPageElements.TAB_SDK_CONFIGURATION);
};

module.exports = {
    verifyEmptyPageElements,
    clickSdkStatsTab,
    clickRequestStatsTab,
    clickHealthCheckTab,
    clickSdkConfigurationTab
};