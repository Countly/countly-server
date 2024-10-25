import applicationsPageElements from "../../../../support/elements/dashboard/manage/apps/apps";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: applicationsPageElements.PAGE_TITLE,
        labelText: "Application Management",
        element: applicationsPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_LIST,
    });

    cy.verifyElement({
        element: applicationsPageElements.LISTBOX_SEARCH_INPUT,
        elementPlaceHolder: "Search in 1 App"
    });

    cy.verifyElement({
        element: applicationsPageElements.ADD_NEW_APP_BUTTON,
        elementText: "Add new app",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APP_INFORMATION_LABEL,
        labelText: "APP INFORMATION",
        element: applicationsPageElements.EDIT_BUTTON,
        elementText: "Edit",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APPLICATION_NAME_LABEL,
        labelText: "Application Name",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APPLICATION_TYPE_LABEL,
        labelText: "Application Type",
        element: applicationsPageElements.APPLICATION_TYPE_DESCRIPTION_LABEL,
        elementText: "All data will be recorded for this application type",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.COUNTRY_LABEL,
        labelText: "Country",
        element: applicationsPageElements.COUNTRY_DESCRIPTION_LABEL,
        elementText: "City information will be only recorded for this country",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.TIMEZONE_LABEL,
        labelText: "Time Zone",
        element: applicationsPageElements.TIMEZONE_DESCRIPTION_LABEL,
        elementText: "All data will be recorded in this timezone",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.SALT_FOR_CHECKSUM_LABEL,
        labelText: "Salt for checksum",
        element: applicationsPageElements.SALT_FOR_CHECKSUM_DESCRIPTION_LABEL,
        elementText: "Will only accept requests where checksum is signed with the same salt in SDK",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APP_ID_LABEL,
        labelText: "App ID",
        element: applicationsPageElements.APP_ID_DESCRIPTION_LABEL,
        elementText: "This ID is used for the read API",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APP_KEY_LABEL,
        labelText: "App Key",
        element: applicationsPageElements.APP_KEY_DESCRIPTION_LABEL,
        elementText: "You'll need this key for SDK integration",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APP_ICON_LABEL,
        labelText: "App Icon",
        element: applicationsPageElements.ADD_ICON_BUTTON,
        elementText: "Add Icon",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.ADD_UPLOAD_INSRUCTIONS_LABEL,
        labelText: "Only jpg, png and gif image formats are allowed",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: applicationsPageElements.APPLICATION_NAME_VALUE_LABEL,
        elementText: "Test",
    });

    cy.verifyElement({
        element: applicationsPageElements.APPLICATION_TYPE_VALUE_LABEL,
    });

    cy.verifyElement({
        element: applicationsPageElements.COUNTRY_VALUE_LABEL,
    });

    cy.verifyElement({
        element: applicationsPageElements.TIMEZONE_VALUE_LABEL,
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_ID_VALUE_LABEL,
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_KEY_VALUE_LABEL,
    });

    cy.verifyElement({
        element: applicationsPageElements.AVATAR_APP_ICON,
    });
};

module.exports = {
    verifyEmptyPageElements
};