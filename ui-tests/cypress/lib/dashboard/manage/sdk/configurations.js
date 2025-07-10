import sdkConfiguratonsPageElements from "../../../../support/elements/dashboard/manage/sdk/configurations";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        element: sdkConfiguratonsPageElements.TAB_SDK_STATS,
        elementText: "SDK Stats",
    });

    cy.verifyElement({
        element: sdkConfiguratonsPageElements.TAB_REQUEST_STATS,
        elementText: "Request Stats",
    });

    cy.verifyElement({
        element: sdkConfiguratonsPageElements.TAB_HEALTH_CHECK,
        elementText: "Health Check",
    });

    cy.verifyElement({
        element: sdkConfiguratonsPageElements.TAB_SDK_CONFIGURATION,
        elementText: "SDK Behavior Settings",
    });

    cy.verifyElement({
        labelElement: sdkConfiguratonsPageElements.PAGE_TITLE,
        labelText: "SDK Behavior Settings",
        tooltipElement: sdkConfiguratonsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "This is experimental feature and not all SDKs and SDK versions yet support it. Refer to the SDK documentation for more information"
    });

    cy.verifyElement({
        labelElement: sdkConfiguratonsPageElements.SDK_CONTROL_LABEL,
        labelText: "Global Controls",
    });

    cy.verifyElement({
        labelElement: sdkConfiguratonsPageElements.SDK_TRACKING_LABEL,
        labelText: "Allow Tracking",
    });

    cy.verifyElement({
        labelElement: sdkConfiguratonsPageElements.SDK_TRACKING_DESCRIPTION,
        labelText: "Enable or disable any tracking (gathering) of data in the SDK (default: enabled)",
    });

    cy.verifyElement({
        labelElement: sdkConfiguratonsPageElements.SDK_NETWORKING_LABEL,
        labelText: "Allow Networking",
    });

    cy.verifyElement({
        labelElement: sdkConfiguratonsPageElements.SDK_NETWORKING_DESCRIPTION,
        labelText: "Enable or disable all networking calls from SDK except SDK config call. Does not effect tracking of data (default: enabled)",
    });
};

const verifyPageElements = ({
    isSdkTrackingEnabled = true,
    isSdkNetworkingEnabled = true
}) => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: sdkConfiguratonsPageElements.SDK_TRACKING_SWITCH,
        isChecked: isSdkTrackingEnabled
    });

    cy.verifyElement({
        element: sdkConfiguratonsPageElements.SDK_NETWORKINF_SWITCH,
        isChecked: isSdkNetworkingEnabled
    });
};

const clickSdkStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkConfiguratonsPageElements.TAB_SDK_STATS);
};

const clickRequestStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkConfiguratonsPageElements.TAB_REQUEST_STATS);
};

const clickHealthCheckTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkConfiguratonsPageElements.TAB_HEALTH_CHECK);
};

const clickSdkConfigurationTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(sdkConfiguratonsPageElements.TAB_SDK_CONFIGURATION);
};

module.exports = {
    verifyPageElements,
    clickSdkStatsTab,
    clickRequestStatsTab,
    clickHealthCheckTab,
    clickSdkConfigurationTab
};
