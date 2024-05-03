import analyticsTechnologyGeoCountriesPageElements from "../../../../../support/elements/dashboard/analytics/geo/countries/countries";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsTechnologyGeoCountriesPageElements.PAGE_TITLE,
        labelText: "Countries",
        tooltipElement: analyticsTechnologyGeoCountriesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "An overview of the geographical distribution of your users and their sessions in the selected time period."
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.WORLD_MAP,
    });

    cy.scrollPageToTop();
    
    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TAB_COUNTRIES,
        elementText: "Countries",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TAB_LANGUAGES,
        elementText: "Languages",
    });


    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_SESSIONS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_SESSIONS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyGeoCountriesPageElements.TOTAL_SESSIONS_LABEL,
        labelText: "Total Sessions",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_USERS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_USERS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyGeoCountriesPageElements.TOTAL_USERS_LABEL,
        labelText: "Total Users",
    });

    // TO DO => If has data, there is no tooltip  
    // cy.verifyElement({
    //     tooltipElement: analyticsTechnologyGeoCountriesPageElements.COUNTRIES.TOTAL_USERS_NUMBER,
    //     tooltipText: "Total (unique) value for this period is estimated and corrected using the biggest time buckets from available daily, weekly and monthly stats.Exact total counts are available for this year, month and day periods"
    // });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.NEW_USERS_RADIO_BUTTON,
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.NEW_USERS_RADIO_BOX,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyGeoCountriesPageElements.NEW_USERS_LABEL,
        labelText: "New Users",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_SESSIONS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_SESSIONS_TREND_ICON,
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_SESSIONS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_USERS_NUMBER,
        elementText: "~0",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_USERS_TREND_ICON,
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.TOTAL_USERS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.NEW_USERS_NUMBER,
        elementText: "0",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.NEW_USERS_TREND_ICON,
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.NEW_USERS_TREND_VALUE,
        elementText: "NA",
    });

    cy.verifyElement({
        element: analyticsTechnologyGeoCountriesPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyGeoCountriesPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsTechnologyGeoCountriesPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickCountriesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyGeoCountriesPageElements.TAB_COUNTRIES);
};

const clickLanguagesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsTechnologyGeoCountriesPageElements.TAB_LANGUAGES);
};

module.exports = {
    verifyEmptyPageElements,
    clickCountriesTab,
    clickLanguagesTab
};