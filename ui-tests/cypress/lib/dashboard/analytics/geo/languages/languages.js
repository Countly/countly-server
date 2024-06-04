import analyticsGeoLanguagesPageElements from "../../../../../support/elements/dashboard/analytics/geo/languages/languages";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: analyticsGeoLanguagesPageElements.PAGE_TITLE,
        labelText: "Languages",
        tooltipElement: analyticsGeoLanguagesPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Details of the application languages your users are using, in the selected time period and as determined by their default device language settings."
    });

    cy.verifyElement({
        element: analyticsGeoLanguagesPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: analyticsGeoLanguagesPageElements.TAB_COUNTRIES,
        elementText: "Countries",
    });

    cy.verifyElement({
        element: analyticsGeoLanguagesPageElements.TAB_LANGUAGES,
        elementText: "Languages",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: analyticsGeoLanguagesPageElements.EMPTY_PIE_NEW_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsGeoLanguagesPageElements.EMPTY_PIE_NEW_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsGeoLanguagesPageElements.EMPTY_PIE_NEW_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsGeoLanguagesPageElements.EMPTY_PIE_TOTAL_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsGeoLanguagesPageElements.EMPTY_PIE_TOTAL_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsGeoLanguagesPageElements.EMPTY_PIE_TOTAL_SUBTITLE,
        labelText: "No data found",
    });

    cy.verifyElement({
        element: analyticsGeoLanguagesPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: analyticsGeoLanguagesPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: analyticsGeoLanguagesPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickCountriesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsGeoLanguagesPageElements.TAB_COUNTRIES);
};

const clickLanguagesTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(analyticsGeoLanguagesPageElements.TAB_LANGUAGES);
};

module.exports = {
    verifyEmptyPageElements,
    clickCountriesTab,
    clickLanguagesTab
};