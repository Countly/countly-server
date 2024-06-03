import remoteConfigPageElements from "../../../support/elements/dashboard/remoteConfig/remoteConfig";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: remoteConfigPageElements.PAGE_TITLE,
        labelText: "Remote Config"
    });

    cy.verifyElement({
        element: remoteConfigPageElements.PAGE_TITLE_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: remoteConfigPageElements.ADD_PARAMETER_BUTTON,
        elementText: 'Add Parameter'
    });

    cy.verifyElement({
        element: remoteConfigPageElements.EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: remoteConfigPageElements.DATATABLE_SEARCH_INPUT,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: remoteConfigPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: remoteConfigPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: remoteConfigPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

module.exports = {
    verifyEmptyPageElements,
};