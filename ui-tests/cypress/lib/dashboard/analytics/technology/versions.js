import {
    versionsPageElements,
    versionsEGraphElements,
    versionsDataTableElements
} from "../../../../support/elements/dashboard/analytics/technology/versions";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: versionsPageElements.PAGE_TITLE,
        labelText: "App Versions",
        tooltipElement: versionsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Detailed information on the application versions of your application accessed by your users within the selected time period."
    });

    cy.verifyElement({
        element: versionsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: versionsPageElements.APP_VERSIONS_FOR_LABEL,
        labelText: "App versions for",
    });

    cy.verifyElement({
        element: versionsPageElements.APP_VERSIONS_FOR_COMBOBOX,
    });

    cy.verifyElement({
        labelElement: versionsPageElements.AS_LABEL,
        labelText: "as",
    });

    cy.verifyElement({
        element: versionsPageElements.AS_VALUE_COMBOBOX,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: versionsPageElements.TAB_PLATFORMS,
        elementText: "Platforms",
    });

    cy.verifyElement({
        element: versionsPageElements.TAB_DEVICES_AND_TYPES,
        elementText: "Devices and Types",
    });

    cy.verifyElement({
        element: versionsPageElements.TAB_RESOLUTIONS,
        elementText: "Resolutions",
    });

    cy.verifyElement({
        element: versionsPageElements.TAB_APP_VERSIONS,
        elementText: "App Versions",
    });

    cy.verifyElement({
        element: versionsPageElements.TAB_CARRIERS,
        elementText: "Carriers",
    });

    cy.verifyElement({
        element: versionsPageElements.TAB_DENSITIES,
        elementText: "Densities",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyVersionsEGraph({
        isEmpty: true,
    });

    verifyVersionsDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyVersionsEGraph({
        isEmpty: false,
    });

    verifyVersionsDataFromTable({
        isEmpty: false,
    });
};

const verifyVersionsEGraph = ({
    index = 0,
    isEmpty = false
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: versionsEGraphElements().EMPTY_EGRAPH_ICON,
        });

        cy.verifyElement({
            labelElement: versionsEGraphElements().EMPTY_EGRAPH_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: versionsEGraphElements().EMPTY_EGRAPH_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: versionsEGraphElements().ECHARTS,
    });

    cy.verifyElement({
        element: versionsEGraphElements().VERSIONS_NAMES,
    });

    cy.verifyElement({
        element: versionsEGraphElements().VERSIONS_ICONS,
    });
};

const verifyVersionsDataFromTable = ({
    index = 0,
    isEmpty = false,
    appVersion = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    cy.scrollPageToBottom();

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
        element: versionsDataTableElements(index).APP_VERSION,
        elementText: appVersion
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
    cy.clickElement(versionsPageElements.TAB_PLATFORMS);
};

const clickDevicesAndTypesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(versionsPageElements.TAB_DEVICES_AND_TYPES);
};

const clickResolutionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(versionsPageElements.TAB_RESOLUTIONS);
};

const clickAppVersionsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(versionsPageElements.TAB_APP_VERSIONS);
};

const clickCarriersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(versionsPageElements.TAB_CARRIERS);
};

const clickDensitiesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(versionsPageElements.TAB_DENSITIES);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickPlatformsTab,
    clickDevicesAndTypesTab,
    clickResolutionsTab,
    clickAppVersionsTab,
    clickCarriersTab,
    clickDensitiesTab,
    verifyVersionsEGraph,
    verifyVersionsDataFromTable
};