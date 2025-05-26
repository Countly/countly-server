import {
    languagesPageElements,
    languagesEGraphElements,
    languagesDataTableElements
} from "../../../../../support/elements/dashboard/analytics/geo/languages/languages";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: languagesPageElements.PAGE_TITLE,
        labelText: "Languages",
        tooltipElement: languagesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the application's languages your users use in the selected time period, based on their default device language settings."
    });

    cy.verifyElement({
        element: languagesPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: languagesPageElements.TAB_COUNTRIES,
        elementText: "Countries",
    });

    cy.verifyElement({
        element: languagesPageElements.TAB_LANGUAGES,
        elementText: "Languages",
    });

    cy.verifyElement({
        element: languagesDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: languagesDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_LANGUAGE_LABEL,
        elementText: "Language",
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_LANGUAGE_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: languagesDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyLanguagesEGraph({
        isEmpty: true,
    });

    verifyLanguagesDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyLanguagesEGraph({
        isEmpty: false,
    });

    verifyLanguagesDataFromTable({
        isEmpty: false,
    });
};


const verifyLanguagesEGraph = ({
    isEmpty = false
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: languagesEGraphElements().EMPTY_PIE_TOTAL_ICON,
        });

        cy.verifyElement({
            labelElement: languagesEGraphElements().EMPTY_PIE_TOTAL_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: languagesEGraphElements().EMPTY_PIE_TOTAL_SUBTITLE,
            labelText: "No data found",
        });

        cy.verifyElement({
            element: languagesEGraphElements().EMPTY_PIE_NEW_ICON,
        });

        cy.verifyElement({
            labelElement: languagesEGraphElements().EMPTY_PIE_NEW_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: languagesEGraphElements().EMPTY_PIE_NEW_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: languagesEGraphElements().ECHARTS,
    });

    cy.verifyElement({
        element: languagesEGraphElements().LANGUAGES_NAMES,
    });

    cy.verifyElement({
        element: languagesEGraphElements().LANGUAGES_VALUES,
    });

    cy.verifyElement({
        element: languagesEGraphElements().LANGUAGES_ICONS,
    });
};

const verifyLanguagesDataFromTable = ({
    index = 0,
    isEmpty = false,
    language = null,
    totalSessions = null,
    totalSessionsPercentage = null,
    totalUsers = null,
    totalUsersPercentage = null,
    newUsers = null,
    newUsersPercentage = null
}) => {

    cy.scrollPageToBottom();

    if (isEmpty) {

        cy.verifyElement({
            element: languagesDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: languagesDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: languagesDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: languagesDataTableElements(index).LANGUAGE,
        elementText: language
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: languagesDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        element: languagesDataTableElements(index).TOTAL_SESSIONS_DIVIDER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: languagesDataTableElements(index).TOTAL_SESSIONS_PERCENT,
        elementText: totalSessionsPercentage
    });

    cy.verifyElement({
        element: languagesDataTableElements(index).TOTAL_SESSIONS_PROGRESS_BAR,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: languagesDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        element: languagesDataTableElements(index).TOTAL_USERS_DIVIDER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: languagesDataTableElements(index).TOTAL_USERS_PERCENT,
        elementText: totalUsersPercentage
    });

    cy.verifyElement({
        element: languagesDataTableElements(index).TOTAL_USERS_PROGRESS_BAR,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: languagesDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });

    cy.verifyElement({
        element: languagesDataTableElements(index).NEW_USERS_DIVIDER,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: languagesDataTableElements(index).NEW_USERS_PERCENT,
        elementText: newUsersPercentage
    });

    cy.verifyElement({
        element: languagesDataTableElements(index).NEW_USERS_PROGRESS_BAR,
    });

};

const clickCountriesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(languagesPageElements.TAB_COUNTRIES);
};

const clickLanguagesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(languagesPageElements.TAB_LANGUAGES);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyLanguagesEGraph,
    verifyLanguagesDataFromTable,
    clickCountriesTab,
    clickLanguagesTab
};