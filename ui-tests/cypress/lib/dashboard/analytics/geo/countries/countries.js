import {
    countriesPageElements,
    countriesMetricCardElements,
    countriesDataTableElements
} from "../../../../../support/elements/dashboard/analytics/geo/countries/countries";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: countriesPageElements.PAGE_TITLE,
        labelText: "Countries",
        tooltipElement: countriesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "An overview of the geographical distribution of your users and their sessions in the selected time period."
    });

    cy.verifyElement({
        element: countriesPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.WORLD_MAP,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: countriesPageElements.TAB_COUNTRIES,
        elementText: "Countries",
    });

    cy.verifyElement({
        element: countriesPageElements.TAB_LANGUAGES,
        elementText: "Languages",
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_SESSIONS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_SESSIONS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: countriesMetricCardElements.TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_USERS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_USERS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: countriesMetricCardElements.TOTAL_USERS_LABEL,
        labelText: "Total Users",
    });

    //TODO: Will be opened after https://countly.atlassian.net/browse/SER-1798 Fixed
    // cy.verifyElement({
    //     tooltipElement: countriesMetricCardElements.TOTAL_USERS_NUMBER,
    //     tooltipText: "Total (unique) value for this period is estimated and corrected using the biggest time buckets from available daily, weekly and monthly stats. Exact total counts are available for this year, month and day periods"
    // });

    cy.verifyElement({
        element: countriesMetricCardElements.NEW_USERS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.NEW_USERS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: countriesMetricCardElements.NEW_USERS_LABEL,
        labelText: "New Users",
    });

    cy.verifyElement({
        element: countriesDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: countriesDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_COUNTRY_LABEL,
        elementText: "Country",
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_COUNTRY_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_LABEL,
        elementText: "Total Sessions",
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_TOTAL_SESSIONS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        elementText: "Total Users",
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        elementText: "New Users",
    });

    cy.verifyElement({
        element: countriesDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyCountriesMetricCard({
        isEmpty: true,
    });

    verifyCountriesDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyCountriesMetricCard({
        isEmpty: false,
        totalSessionNumber: "1000",
        totalSessionPercentage: "NA",
        totalUserNumber: "100",
        totalUserPercentage: "NA",
        newUserNumber: "100",
        newUserPercentage: "NA"
    });

    verifyCountriesDataFromTable({
        isEmpty: false,
    });
};

const verifyCountriesMetricCard = ({
    isEmpty = false,
    totalSessionNumber = "0",
    totalSessionPercentage = "NA",
    totalUserNumber = "~0",
    totalUserPercentage = "NA",
    newUserNumber = "0",
    newUserPercentage = "NA"
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: countriesMetricCardElements.TOTAL_SESSIONS_NUMBER,
            elementText: totalSessionNumber,
        });

        cy.verifyElement({
            element: countriesMetricCardElements.TOTAL_SESSIONS_TREND_ICON,
        });

        cy.verifyElement({
            element: countriesMetricCardElements.TOTAL_SESSIONS_TREND_VALUE,
            elementText: totalSessionPercentage,
        });

        cy.verifyElement({
            element: countriesMetricCardElements.TOTAL_USERS_NUMBER,
            elementText: totalUserNumber,
        });

        //TODO: Will be removed after https://countly.atlassian.net/browse/SER-1798 Fixed... will be verified by line 61
        cy.verifyElement({
            tooltipElement: countriesMetricCardElements.TOTAL_USERS_NUMBER,
            tooltipText: "Total (unique) value for this period is estimated and corrected using the biggest time buckets from available daily, weekly and monthly stats. Exact total counts are available for this year, month and day periods"
        });

        cy.verifyElement({
            element: countriesMetricCardElements.TOTAL_USERS_TREND_ICON,
        });

        cy.verifyElement({
            element: countriesMetricCardElements.TOTAL_USERS_TREND_VALUE,
            elementText: totalUserPercentage,
        });

        cy.verifyElement({
            element: countriesMetricCardElements.NEW_USERS_NUMBER,
            elementText: newUserNumber,
        });

        cy.verifyElement({
            element: countriesMetricCardElements.NEW_USERS_TREND_ICON,
        });

        cy.verifyElement({
            element: countriesMetricCardElements.NEW_USERS_TREND_VALUE,
            elementText: newUserPercentage,
        });
        return;
    }

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_SESSIONS_NUMBER,
        elementText: totalSessionNumber,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_SESSIONS_TREND_VALUE,
        elementText: totalSessionPercentage,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_USERS_NUMBER,
        elementText: totalUserNumber,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_USERS_TREND_ICON,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.TOTAL_USERS_TREND_VALUE,
        elementText: totalUserPercentage,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.NEW_USERS_NUMBER,
        elementText: newUserNumber,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.NEW_USERS_TREND_ICON,
    });

    cy.verifyElement({
        element: countriesMetricCardElements.NEW_USERS_TREND_VALUE,
        elementText: newUserPercentage,
    });
};

const verifyCountriesDataFromTable = ({
    index = 0,
    isEmpty = false,
    country = null,
    totalSessions = null,
    totalUsers = null,
    newUsers = null,
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: countriesDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: countriesDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: countriesDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: countriesDataTableElements(index).COUNTRY,
        elementText: country
    });

    cy.verifyElement({
        element: countriesDataTableElements(index).COUNTRY_FLAG,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: countriesDataTableElements(index).TOTAL_SESSIONS,
        elementText: totalSessions
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: countriesDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: countriesDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });
};

const clickCountriesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(countriesPageElements.TAB_COUNTRIES);
};

const clickLanguagesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(countriesPageElements.TAB_LANGUAGES);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyCountriesMetricCard,
    verifyCountriesDataFromTable,
    clickCountriesTab,
    clickLanguagesTab
};