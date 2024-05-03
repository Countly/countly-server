import crashesPageElements from "../../../support/elements/dashboard/crashes/crashes";

const verifyStaticElementsOfCrashGroupsPage = () => {
    cy.verifyElement({
        labelElement: crashesPageElements.PAGE_TITLE,
        labelText: "Crash Groups",
        tooltipElement: crashesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "An overview of all Crash Groups. Filter, edit, and review the Crash Groups to see crash details."
    });

    cy.verifyElement({
        labelElement: crashesPageElements.AUTO_REFRESH_IS_LABEL,
        labelText: "Auto-refresh is"
    });

    cy.verifyElement({
        labelElement: crashesPageElements.ENABLED_LABEL,
        labelText: "Enabled",
        tooltipElement: crashesPageElements.AUTO_REFRESH_IS_ENABLED_TOOLTIP,
        tooltipText: "Automatically refresh can be adjusted through this switch"
    });

    cy.verifyElement({
        element: crashesPageElements.STOP_AUTO_REFRESH_BUTTON,
    });

    cy.verifyElement({
        element: crashesPageElements.EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: crashesPageElements.EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: crashesPageElements.DATATABLE_SEARCH_INPUT,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: crashesPageElements.TAB_CRASH_GROUPS,
        elementText: "Crash Groups",
    });

    cy.verifyElement({
        element: crashesPageElements.TAB_CRASH_STATISTICS,
        elementText: "Crash Statistics",
    });
}

const verifyStaticElementsOfCrashStatisticsPage = () => {
    cy.verifyElement({
        labelElement: crashesPageElements.PAGE_TITLE,
        labelText: "Crash Statistics",
        //tooltipElement: crashesPageElements.PAGE_TITLE_TOOLTIP, TO DO
        //tooltipText: "An overview of the statistics of all crashes, as well as a graphic representation of selected crash metrics, in a selected time period."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: crashesPageElements.TAB_CRASH_GROUPS,
        elementText: "Crash Groups",
    });

    cy.verifyElement({
        element: crashesPageElements.TAB_CRASH_STATISTICS,
        elementText: "Crash Statistics",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.AFFECTED_USERS_LABEL,
        labelText: "Affected Users",
        tooltipElement: crashesPageElements.AFFECTED_USERS_TOOLTIP,
        tooltipText: "Amount of all your app users that had this crash. Amount gets reduced when users upgrade to version higher than for which crash was resolved"
    });

    cy.verifyElement({
        element: crashesPageElements.AFFECTED_USERS_DESCRIPTION_PROGRESS_CIRCLE,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.RESOLUTION_STATUS_LABEL,
        labelText: "Resolution Status",
        tooltipElement: crashesPageElements.RESOLUTION_STATUS_TOOLTIP,
        tooltipText: "Percentage of the crashes that have been resolved over the total number of crashes that have occurred."
    });

    cy.verifyElement({
        element: crashesPageElements.RESOLUTION_STATUS_DESCRIPTION_PROGRESS_CIRCLE,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FATALITY_LABEL,
        labelText: "Crash Fatality",
        tooltipElement: crashesPageElements.CRASH_FATALITY_TOOLTIP,
        tooltipText: "Number of fatal crashes, expressed as a percentage of the total number of crashes that have occurred."
    });

    cy.verifyElement({
        element: crashesPageElements.CRASH_FATALITY_DESCRIPTION_PROGRESS_CIRCLE,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.TOP_PLATFORMS_LABEL,
        labelText: "Top Platforms",
        tooltipElement: crashesPageElements.TOP_PLATFORMS_TOOLTIP,
        tooltipText: "Details of the platforms on which crashes have occurred. Top 4 platforms are listed here."
    });

    cy.verifyElement({
        labelElement: crashesPageElements.NEW_CRASHES_LABEL,
        labelText: "New Crashes",
        tooltipElement: crashesPageElements.NEW_CRASHES_TOOLTIP,
        tooltipText: "Number of crashes that have not yet been viewed."
    });

    cy.verifyElement({
        labelElement: crashesPageElements.REOCCURRED_CRASHES_LABEL,
        labelText: "Reoccurred Crashes",
        tooltipElement: crashesPageElements.REOCCURRED_CRASHES_TOOLTIP,
        tooltipText: "Number of crashes that have occurred multiple times."
    });

    cy.verifyElement({
        labelElement: crashesPageElements.REVENUE_LOSS_LABEL,
        labelText: "Revenue Loss",
        tooltipElement: crashesPageElements.REVENUE_LOSS_TOOLTIP,
        tooltipText: "Value of revenue potentially lost as a result of crashes occurred on Revenue Events."
    });

    cy.verifyElement({
        element: crashesPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FILTERS_LABEL,
        labelText: "Crash Filters",
        element: crashesPageElements.FILTER_PARAMETERS_SELECT
    });

    cy.verifyElement({
        labelElement: crashesPageElements.TOTAL_OCCURENCES_LABEL,
        labelText: "Total Occurences",
        tooltipElement: crashesPageElements.TOTAL_OCCURENCES_TOOLTIP,
        tooltipText: "Timeline of all occurrences of all crashes. Same crash may occurred multiple times for same or different users."
    });

    cy.verifyElement({
        element: crashesPageElements.TOTAL_OCCURENCES_ARROW,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.UNIQUE_CRASHES_LABEL,
        labelText: "Unique Crashes",
        tooltipElement: crashesPageElements.UNIQUE_CRASHES_TOOLTIP,
        tooltipText: "Timeline of crash types. Only the first ocurrence of each crash time recorded here."
    });

    cy.verifyElement({
        element: crashesPageElements.UNIQUE_CRASHES_ARROW,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASHES_OR_SESSIONS_LABEL,
        labelText: "Crashes / Sessions",
        tooltipElement: crashesPageElements.CRASHES_OR_SESSIONS_TOOLTIP,
        tooltipText: "How often in amount of sessions the app crashes for each user"
    });

    cy.verifyElement({
        element: crashesPageElements.CRASHES_OR_SESSIONS_ARROW,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FREE_USERS_LABEL,
        labelText: "Crash-free Users",
        tooltipElement: crashesPageElements.CRASH_FREE_USERS_TOOLTIP,
        tooltipText: "Number of users who have not experienced a crash for the applied filter in the selected time period, expressed as a percentage of the total number of users within that time period."
    });

    cy.verifyElement({
        element: crashesPageElements.CRASH_FREE_USERS_ARROW,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FREE_SESSIONS_LABEL,
        labelText: "Crash-free Sessions",
        tooltipElement: crashesPageElements.CRASH_FREE_SESSIONS_TOOLTIP,
        tooltipText: "Number of sessions during which the selected crash did not occur in the selected time period, expressed as a percentage of the total number of sessions within that time period."
    });

    cy.verifyElement({
        element: crashesPageElements.CRASH_FREE_SESSIONS_ARROW,
    });

    cy.verifyElement({
        element: crashesPageElements.TOTAL_OCCURENCES_GRAPH,
    });
}


const verifyEmptyPageElements = () => {

    verifyStaticElementsOfCrashGroupsPage();

    cy.verifyElement({
        element: crashesPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: crashesPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });

    clickCrashStatisticsTab();

    verifyStaticElementsOfCrashStatisticsPage();

    cy.verifyElement({
        labelElement: crashesPageElements.AFFECTED_USERS_NUMBER_LABEL,
        labelText: "0%",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.AFFECTED_USERS_DESCRIPTION_LABEL,
        labelText: "0 of 0 Total Users",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.RESOLUTION_STATUS_NUMBER_LABEL,
        labelText: "0%",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.RESOLUTION_STATUS_DESCRIPTION_LABEL,
        labelText: "0 Resolved of 0 Total Crashes",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FATALITY_NUMBER_LABEL,
        labelText: "0%",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FATALITY_DESCRIPTION_LABEL,
        labelText: "0 Fatal of 0 Total Crashes",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.NEW_CRASHES_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.REOCCURRED_CRASHES_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.REVENUE_LOSS_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.TOTAL_OCCURENCES_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.TOTAL_OCCURENCES_CHANGE_VALUE_LABEL,
        labelText: "NA",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.UNIQUE_CRASHES_NUMBER_LABEL,
        labelText: "~0",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.TOTAL_OCCURENCES_CHANGE_VALUE_LABEL,
        labelText: "NA",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASHES_OR_SESSIONS_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FREE_USERS_NUMBER_LABEL,
        labelText: "100.00%",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FREE_USERS_CHANGE_VALUE_LABEL,
        labelText: "0.0%",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FREE_SESSIONS_NUMBER_LABEL,
        labelText: "100.00%",
    });

    cy.verifyElement({
        labelElement: crashesPageElements.CRASH_FREE_SESSIONS_CHANGE_VALUE_LABEL,
        labelText: "0.0%",
    });
};

const clickCrashGroupsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(crashesPageElements.TAB_CRASH_GROUPS);
};

const clickCrashStatisticsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(crashesPageElements.TAB_CRASH_STATISTICS);
};

module.exports = {
    verifyEmptyPageElements,
    clickCrashGroupsTab,
    clickCrashStatisticsTab
};