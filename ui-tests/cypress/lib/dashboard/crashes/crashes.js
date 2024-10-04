import {
    crashPageElements,
    crashGroupsPageElements,
    crashGroupsDataTableElements,
    crashStatisticsMetricCardElements,
    crashStatisticsEChartElements
} from "../../../support/elements/dashboard/crashes/crashes";

const verifyStaticElementsOfCrashGroupsPage = () => {
    cy.verifyElement({
        element: crashPageElements.TAB_CRASH_GROUPS,
        elementText: "Crash Groups",
    });

    cy.verifyElement({
        element: crashPageElements.TAB_CRASH_STATISTICS,
        elementText: "Crash Statistics",
    });

    cy.verifyElement({
        labelElement: crashPageElements.PAGE_TITLE,
        labelText: "Crash Groups",
        tooltipElement: crashPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "An overview of all Crash Groups. Filter, edit, and review the Crash Groups to see crash details."
    });

    cy.verifyElement({
        labelElement: crashGroupsPageElements.AUTO_REFRESH_IS_LABEL,
        labelText: "Auto-refresh is"
    });

    cy.verifyElement({
        labelElement: crashGroupsPageElements.ENABLED_LABEL,
        labelText: "Enabled",
        tooltipElement: crashGroupsPageElements.AUTO_REFRESH_IS_ENABLED_TOOLTIP,
        tooltipText: "Automatically refresh can be adjusted through this switch"
    });

    cy.verifyElement({
        element: crashGroupsPageElements.STOP_AUTO_REFRESH_BUTTON,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_CRASH_GROUP_LABEL,
        isElementVisible: false,
        elementText: "Crash Group",
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_PLATFORM_LABEL,
        elementText: "Platform",
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_PLATFORM_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_OCCURRENCES_LABEL,
        elementText: "Occurrences",
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_OCCURRENCES_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_LAST_OCCURRENCES_LABEL,
        elementText: "Last occurrence",
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_LAST_OCCURRENCES_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_AFFECTED_USERS_LABEL,
        elementText: "Affected Users",
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_AFFECTED_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_LATEST_APP_VERSION_LABEL,
        elementText: "Latest app version",
    });

    cy.verifyElement({
        element: crashGroupsDataTableElements().COLUMN_NAME_LATEST_APP_VERSION_SORTABLE_ICON,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: crashPageElements.TAB_CRASH_GROUPS,
        elementText: "Crash Groups",
    });

    cy.verifyElement({
        element: crashPageElements.TAB_CRASH_STATISTICS,
        elementText: "Crash Statistics",
    });
};

const verifyStaticElementsOfCrashStatisticsPage = () => {

    cy.verifyElement({
        element: crashPageElements.TAB_CRASH_GROUPS,
        elementText: "Crash Groups",
    });

    cy.verifyElement({
        element: crashPageElements.TAB_CRASH_STATISTICS,
        elementText: "Crash Statistics",
    });

    cy.verifyElement({
        labelElement: crashPageElements.PAGE_TITLE,
        labelText: "Crash Statistics",
        //tooltipElement: crashesPageElements.PAGE_TITLE_TOOLTIP, TO DO
        //tooltipText: "An overview of the statistics of all crashes, as well as a graphic representation of selected crash metrics, in a selected time period."
    });

    cy.verifyElement({
        labelElement: crashStatisticsMetricCardElements().AFFECTED_USERS_LABEL,
        labelText: "Affected Users",
        tooltipElement: crashStatisticsMetricCardElements().AFFECTED_USERS_TOOLTIP,
        tooltipText: "Amount of all your app users that had this crash. Amount gets reduced when users upgrade to version higher than for which crash was resolved"
    });

    cy.verifyElement({
        element: crashStatisticsMetricCardElements().AFFECTED_USERS_DESCRIPTION_PROGRESS_CIRCLE,
    });

    cy.verifyElement({
        labelElement: crashStatisticsMetricCardElements().RESOLUTION_STATUS_LABEL,
        labelText: "Resolution Status",
        tooltipElement: crashStatisticsMetricCardElements().RESOLUTION_STATUS_TOOLTIP,
        tooltipText: "Percentage of the crashes that have been resolved over the total number of crashes that have occurred."
    });

    cy.verifyElement({
        element: crashStatisticsMetricCardElements().RESOLUTION_STATUS_DESCRIPTION_PROGRESS_CIRCLE,
    });

    cy.verifyElement({
        labelElement: crashStatisticsMetricCardElements().CRASH_FATALITY_LABEL,
        labelText: "Crash Fatality",
        tooltipElement: crashStatisticsMetricCardElements().CRASH_FATALITY_TOOLTIP,
        tooltipText: "Number of fatal crashes, expressed as a percentage of the total number of crashes that have occurred."
    });

    cy.verifyElement({
        element: crashStatisticsMetricCardElements().CRASH_FATALITY_DESCRIPTION_PROGRESS_CIRCLE,
    });

    cy.verifyElement({
        labelElement: crashStatisticsMetricCardElements().TOP_PLATFORMS_LABEL,
        labelText: "Top Platforms",
        tooltipElement: crashStatisticsMetricCardElements().TOP_PLATFORMS_TOOLTIP,
        tooltipText: "Details of the platforms on which crashes have occurred. Top 4 platforms are listed here."
    });

    cy.verifyElement({
        labelElement: crashStatisticsMetricCardElements().NEW_CRASHES_LABEL,
        labelText: "New Crashes",
        tooltipElement: crashStatisticsMetricCardElements().NEW_CRASHES_TOOLTIP,
        tooltipText: "Number of crashes that have not yet been viewed."
    });

    cy.verifyElement({
        labelElement: crashStatisticsMetricCardElements().REOCCURRED_CRASHES_LABEL,
        labelText: "Reoccurred Crashes",
        tooltipElement: crashStatisticsMetricCardElements().REOCCURRED_CRASHES_TOOLTIP,
        tooltipText: "Number of crashes that have occurred multiple times."
    });

    cy.verifyElement({
        labelElement: crashStatisticsMetricCardElements().REVENUE_LOSS_LABEL,
        labelText: "Revenue Loss",
        tooltipElement: crashStatisticsMetricCardElements().REVENUE_LOSS_TOOLTIP,
        tooltipText: "Value of revenue potentially lost as a result of crashes occurred on Revenue Events."
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: crashStatisticsEChartElements.CRASH_FILTERS_LABEL,
        labelText: "Crash Filters",
        element: crashStatisticsEChartElements.FILTER_PARAMETERS_SELECT
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CHART_TYPE_SELECT_COMBOBOX
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CHART_ANNOTATION_BUTTON
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CHART_MORE_BUTTON
    });

    cy.verifyElement({
        labelElement: crashStatisticsEChartElements.TOTAL_OCCURENCES_LABEL,
        labelText: "Total Occurences",
        tooltipElement: crashStatisticsEChartElements.TOTAL_OCCURENCES_TOOLTIP,
        tooltipText: "Timeline of all occurrences of all crashes. Same crash may occurred multiple times for same or different users."
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.TOTAL_OCCURENCES_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: crashStatisticsEChartElements.UNIQUE_CRASHES_LABEL,
        labelText: "Unique Crashes",
        tooltipElement: crashStatisticsEChartElements.UNIQUE_CRASHES_TOOLTIP,
        tooltipText: "Timeline of crash types. Only the first ocurrence of each crash time recorded here."
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.UNIQUE_CRASHES_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: crashStatisticsEChartElements.CRASHES_OR_SESSIONS_LABEL,
        labelText: "Crashes / Sessions",
        tooltipElement: crashStatisticsEChartElements.CRASHES_OR_SESSIONS_TOOLTIP,
        tooltipText: "How often in amount of sessions the app crashes for each user"
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CRASHES_OR_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: crashStatisticsEChartElements.CRASH_FREE_USERS_LABEL,
        labelText: "Crash-free Users",
        tooltipElement: crashStatisticsEChartElements.CRASH_FREE_USERS_TOOLTIP,
        tooltipText: "Number of users who have not experienced a crash for the applied filter in the selected time period, expressed as a percentage of the total number of users within that time period."
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CRASH_FREE_USERS_TREND_ICON,
    });

    cy.verifyElement({
        labelElement: crashStatisticsEChartElements.CRASH_FREE_SESSIONS_LABEL,
        labelText: "Crash-free Sessions",
        tooltipElement: crashStatisticsEChartElements.CRASH_FREE_SESSIONS_TOOLTIP,
        tooltipText: "Number of sessions during which the selected crash did not occur in the selected time period, expressed as a percentage of the total number of sessions within that time period."
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CRASH_FREE_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CHART_PREVIOUS_TOTAL_OCCURENCES_ICON,
        labelElement: crashStatisticsEChartElements.CHART_PREVIOUS_TOTAL_OCCURENCES_LABEL,
        labelText: "previous Total Occurences"
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.CHART_TOTAL_OCCURENCES_ICON,
        labelElement: crashStatisticsEChartElements.CHART_TOTAL_OCCURENCES_LABEL,
        labelText: "Total Occurences"
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfCrashGroupsPage();

    verifyCrashGroupsDataFromTable({
        isEmpty: true,
    });

    clickCrashStatisticsTab();

    verifyStaticElementsOfCrashStatisticsPage();

    verifyCrashStatisticsMetricCard({
        isEmpty: true,
    });

    verifyCrashStatisticsEChartElements({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfCrashGroupsPage();

    verifyCrashGroupsDataFromTable({
        isEmpty: false,
    });

    clickCrashStatisticsTab();

    verifyStaticElementsOfCrashStatisticsPage();

    verifyCrashStatisticsMetricCard({
        isEmpty: false,
    });

    verifyCrashStatisticsEChartElements({
        isEmpty: false,
    });
};

const verifyCrashGroupsDataFromTable = ({
    index = 0,
    isEmpty = false,
    crashGroup = null,
    badgetType = null,
    platform = null,
    occurrences = null,
    lastOccurrences = null,
    affectedUsers = null,
    latestAppVersion = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: crashGroupsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: crashGroupsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: crashGroupsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashGroupsDataTableElements(index).CRASH_GROUP,
        elementText: crashGroup,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashGroupsDataTableElements(index).CRASH_GROUP_BADGE_TYPE_1,
        elementText: badgetType,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashGroupsDataTableElements(index).PLATFORM,
        elementText: platform,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashGroupsDataTableElements(index).OCCURRENCES,
        elementText: occurrences,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashGroupsDataTableElements(index).LAST_OCCURANCES,
        elementText: lastOccurrences,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashGroupsDataTableElements(index).AFFECTED_USERS,
        elementText: affectedUsers,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashGroupsDataTableElements(index).LATEST_APP_VERSION,
        elementText: latestAppVersion,
    });
};

const verifyCrashStatisticsMetricCard = ({
    isEmpty = false,
    affectedUsersPercentage = null,
    affectedUsersTotal = null,
    resolutionStatusPercentage = null,
    resolutionStatusTotal = null,
    crashFatalityPercentage = null,
    crashFatalityTotal = null,
    platformName = null,
    platformUsersPercentage = null,
    newCrashes = null,
    reoccurredCrashes = null,
    revenueLoss = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().AFFECTED_USERS_NUMBER_LABEL,
            labelText: "0%",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().AFFECTED_USERS_DESCRIPTION_LABEL,
            labelText: "0 of 0 Total Users",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().RESOLUTION_STATUS_NUMBER_LABEL,
            labelText: "0%",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().RESOLUTION_STATUS_DESCRIPTION_LABEL,
            labelText: "0 Resolved of 0 Total Crashes",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().CRASH_FATALITY_NUMBER_LABEL,
            labelText: "0%",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().CRASH_FATALITY_DESCRIPTION_LABEL,
            labelText: "0 Fatal of 0 Total Crashes",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().NEW_CRASHES_NUMBER_LABEL,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().REOCCURRED_CRASHES_NUMBER_LABEL,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: crashStatisticsMetricCardElements().REVENUE_LOSS_NUMBER_LABEL,
            labelText: "0",
        });

        cy.shouldNotExist(crashStatisticsMetricCardElements().TOP_PLATFORM_NAME);
        cy.shouldNotExist(crashStatisticsMetricCardElements().TOP_PLATFORM_USER_PERCENTAGE);
        cy.shouldNotExist(crashStatisticsMetricCardElements().TOP_PLATFORM_PROGRESS_BAR);

        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().AFFECTED_USERS_NUMBER_LABEL,
        elementText: affectedUsersPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().AFFECTED_USERS_DESCRIPTION_LABEL,
        elementText: affectedUsersTotal,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().RESOLUTION_STATUS_NUMBER_LABEL,
        elementText: affectedUsersPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().AFFECTED_USERS_DESCRIPTION_LABEL,
        elementText: resolutionStatusPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().RESOLUTION_STATUS_DESCRIPTION_LABEL,
        elementText: resolutionStatusTotal,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().CRASH_FATALITY_NUMBER_LABEL,
        elementText: crashFatalityPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().CRASH_FATALITY_DESCRIPTION_LABEL,
        elementText: crashFatalityTotal,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().TOP_PLATFORM_NAME,
        elementText: platformName,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().TOP_PLATFORM_USER_PERCENTAGE,
        elementText: platformUsersPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().NEW_CRASHES_NUMBER_LABEL,
        elementText: newCrashes,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().REOCCURRED_CRASHES_NUMBER_LABEL,
        elementText: reoccurredCrashes,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsMetricCardElements().REVENUE_LOSS_NUMBER_LABEL,
        elementText: revenueLoss,
    });
};

const verifyCrashStatisticsEChartElements = ({
    isEmpty = false,
    totalOccurences = null,
    totalOccurencePercentage = null,
    uniqueCrashes = null,
    uniqueCrashesPercentage = null,
    crashesSessions = null,
    crashesSessionsPercentage = null,
    crashFreeUsers = null,
    crashFreeUsersPercentage = null,
    crashFreeSessions = null,
    crashFreeSessionsPercentage = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.TOTAL_OCCURENCES_NUMBER_LABEL,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.TOTAL_OCCURENCES_CHANGE_VALUE_LABEL,
            labelText: "NA",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.UNIQUE_CRASHES_NUMBER_LABEL,
            labelText: "~0",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.TOTAL_OCCURENCES_CHANGE_VALUE_LABEL,
            labelText: "NA",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.CRASHES_OR_SESSIONS_NUMBER_LABEL,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.CRASH_FREE_USERS_NUMBER_LABEL,
            labelText: "100.00%",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.CRASH_FREE_USERS_CHANGE_VALUE_LABEL,
            labelText: "0.0%",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.CRASH_FREE_SESSIONS_NUMBER_LABEL,
            labelText: "100.00%",
        });

        cy.verifyElement({
            labelElement: crashStatisticsEChartElements.CRASH_FREE_SESSIONS_CHANGE_VALUE_LABEL,
            labelText: "0.0%",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.TOTAL_OCCURENCES_NUMBER_LABEL,
        elementText: totalOccurences,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.TOTAL_OCCURENCES_CHANGE_VALUE_LABEL,
        elementText: totalOccurencePercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.UNIQUE_CRASHES_NUMBER_LABEL,
        elementText: uniqueCrashes,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.UNIQUE_CRASHES_CHANGE_VALUE_LABEL,
        elementText: uniqueCrashesPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.CRASHES_OR_SESSIONS_NUMBER_LABEL,
        elementText: crashesSessions,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.CRASHES_OR_SESSIONS_CHANGE_VALUE_LABEL,
        elementText: crashesSessionsPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.CRASH_FREE_USERS_NUMBER_LABEL,
        elementText: crashFreeUsers,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.CRASH_FREE_USERS_CHANGE_VALUE_LABEL,
        elementText: crashFreeUsersPercentage,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.CRASH_FREE_SESSIONS_NUMBER_LABEL,
        elementText: crashFreeSessions,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: crashStatisticsEChartElements.CRASH_FREE_SESSIONS_CHANGE_VALUE_LABEL,
        elementText: crashFreeSessionsPercentage,
    });

    cy.verifyElement({
        element: crashStatisticsEChartElements.TOTAL_OCCURENCES_GRAPH,
    });
};

const clickCrashGroupsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(crashPageElements.TAB_CRASH_GROUPS);
};

const clickCrashStatisticsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(crashPageElements.TAB_CRASH_STATISTICS);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickCrashGroupsTab,
    clickCrashStatisticsTab,
    verifyCrashGroupsDataFromTable,
    verifyCrashStatisticsMetricCard,
    verifyCrashStatisticsEChartElements
};