import {
    sdkStatsPageElements,
    sdkStatsMetricCardElements,
    sdkStatsEChartElements,
    sdkStatsSdksDataTableElements,
    sdkStatsSdkVersionsDataTableElements
} from "../../../../support/elements/dashboard/manage/sdk/stats";

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

    clickSDKsTab();

    cy.verifyElement({
        element: sdkStatsSdksDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: sdkStatsSdksDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdksDataTableElements().COLUMN_NAME_SDK_LABEL,
        labelText: "SDK",
    });

    cy.verifyElement({
        element: sdkStatsSdksDataTableElements().COLUMN_NAME_SDK_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdksDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
    });

    cy.verifyElement({
        element: sdkStatsSdksDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdksDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        labelText: "Total Users",
    });

    cy.verifyElement({
        element: sdkStatsSdksDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdksDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        labelText: "New Users",
    });

    cy.verifyElement({
        element: sdkStatsSdksDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });

    clickSdkVersionsTab();

    cy.verifyElement({
        element: sdkStatsSdkVersionsDataTableElements().VERSION_SELECT,
        elementPlaceHolder: "Select",
    });

    cy.verifyElement({
        element: sdkStatsSdkVersionsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: sdkStatsSdkVersionsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_PLATFORM_VERSION_LABEL,
        labelText: "Platform Version",
    });

    cy.verifyElement({
        element: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_PLATFORM_VERSION_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
    });

    cy.verifyElement({
        element: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        labelText: "Total Users",
    });

    cy.verifyElement({
        element: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        labelText: "New Users",
    });

    cy.verifyElement({
        element: sdkStatsSdkVersionsDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.scrollPageToTop();

    verifySdkStatsMetricCard({
        isEmpty: true
    });

    verifySdkStatsEChart({
        isEmpty: true
    });

    verifySDKsDataFromTable({
        isEmpty: true
    });

    verifySDKVersionsDataFromTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    cy.scrollPageToTop();

    verifySdkStatsMetricCard({
        isEmpty: false,
    });

    verifySdkStatsEChart({
        isEmpty: false
    });

    verifySDKsDataFromTable({
        isEmpty: false
    });

    verifySDKVersionsDataFromTable({
        isEmpty: false
    });
};

const verifySdkStatsMetricCard = ({
    index = 0,
    isEmpty = false,
    sdkName = null,
    sdkNumber = null,
    sdkPercentage = null,
    versionName = null,
    versionNumber = null,
    versionPercentage = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            labelElement: sdkStatsMetricCardElements(index).STATS_FOR_TABLE_NO_DATA_LABEL,
            labelText: "No data",
        });

        cy.verifyElement({
            labelElement: sdkStatsMetricCardElements(index).SDK_VERSION_DISTRIBUTION_TABLE_NO_DATA_LABEL,
            labelText: "No data",
        });
        return;
    }
    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsMetricCardElements(index).SDK_NAME,
        elementText: sdkName,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsMetricCardElements(index).SDK_NUMBER,
        elementText: sdkNumber,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsMetricCardElements(index).SDK_PERCENTAGE,
        elementText: sdkPercentage,
    });

    cy.verifyElement({
        element: sdkStatsMetricCardElements(index).SDK_PROGRESS_CIRCLE,
    });

    for (var i = 0; i < 2; i++) {
        cy.verifyElement({
            shouldNot: !isEmpty,
            element: sdkStatsMetricCardElements(i).VERSION_NAME,
            elementText: versionName,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: sdkStatsMetricCardElements(i).VERSION_NUMBER,
            elementText: versionNumber,
        });

        cy.verifyElement({
            element: sdkStatsMetricCardElements(i).VERSION_DIVIDER,
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: sdkStatsMetricCardElements(i).VERSION_PERCENTAGE,
            elementText: versionPercentage,
        });

        cy.verifyElement({
            isElementVisible: false,
            element: sdkStatsMetricCardElements(i).VERSION_PROGRESS_BAR,
        });
    }
};

const verifySdkStatsEChart = ({
    isEmpty = false
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {
        cy.verifyElement({
            element: sdkStatsEChartElements.EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: sdkStatsEChartElements.EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sdkStatsEChartElements.EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
    }
    else {
        cy.verifyElement({
            element: sdkStatsEChartElements.CHART_SDK_VERSION,
        });

        cy.verifyElement({
            element: sdkStatsEChartElements.VERSION_ICONS,
        });

        cy.verifyElement({
            element: sdkStatsEChartElements.VERSION_NUMBERS,
        });

        cy.verifyElement({
            element: sdkStatsEChartElements.CHART_MORE_BUTTON,
        });
    }
};

const verifySDKsDataFromTable = ({
    index = 0,
    isEmpty = false,
    sdkName = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    clickSDKsTab();

    if (isEmpty) {

        cy.verifyElement({
            element: sdkStatsSdksDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: sdkStatsSdksDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sdkStatsSdksDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdksDataTableElements(index).SDK,
        elementText: sdkName
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdksDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdksDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdksDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const verifySDKVersionsDataFromTable = ({
    index = 0,
    isEmpty = false,
    platformVersion = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    clickSdkVersionsTab();

    if (isEmpty) {

        cy.verifyElement({
            element: sdkStatsSdkVersionsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: sdkStatsSdkVersionsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: sdkStatsSdkVersionsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdkVersionsDataTableElements(index).PLATFORM_VERSION,
        elementText: platformVersion
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdkVersionsDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdkVersionsDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: sdkStatsSdkVersionsDataTableElements(index).NEW_USERS,
        elementText: newUsers
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
    verifyFullDataPageElements,
    clickSdkStatsTab,
    clickRequestStatsTab,
    clickHealthCheckTab,
    clickSdkConfigurationTab,
    verifySdkStatsMetricCard,
    verifySdkStatsEChart,
    verifySDKsDataFromTable,
    verifySDKVersionsDataFromTable
};