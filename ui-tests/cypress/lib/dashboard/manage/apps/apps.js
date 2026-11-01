import applicationsPageElements from "../../../../support/elements/dashboard/manage/apps/apps";
import helper from "../../../../../cypress/support/helper";
const { APP_TYPE } = require('../../../../support/constants');

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
        elementText: "Will only accept requests where the checksum is signed with the same salt in the SDK.",
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
        elementText: "You will need this key for SDK integration.",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APP_ICON_LABEL,
        labelText: "App Icon",
        element: applicationsPageElements.ADD_ICON_BUTTON,
        elementText: "Add Icon",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.ADD_UPLOAD_INSRUCTIONS_LABEL,
        labelText: "Only JPG, PNG, and GIF image formats are allowed.",
    });
};

const verifyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        shouldNot: true,
        element: applicationsPageElements.APPLICATION_NAME_VALUE_LABEL,
        elementText: null,
    });

    cy.verifyElement({
        shouldNot: true,
        element: applicationsPageElements.APPLICATION_TYPE_VALUE_LABEL,
        elementText: null,
    });

    cy.verifyElement({
        shouldNot: true,
        element: applicationsPageElements.COUNTRY_VALUE_LABEL,
        elementText: null,
    });

    cy.verifyElement({
        shouldNot: true,
        element: applicationsPageElements.TIMEZONE_VALUE_LABEL,
        elementText: null,
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

const clickAddNewAppButton = () => {
    cy.clickElement(applicationsPageElements.ADD_NEW_APP_BUTTON);
};

const typeAppName = (appName) => {
    cy.typeInput(applicationsPageElements.APP_NAME_INPUT, appName);
};

const selectAppType = (appType) => {

    cy.clickElement(applicationsPageElements.APP_TYPE_DROPDOWN);

    if (appType === APP_TYPE.MOBILE) {
        cy.clickElement(applicationsPageElements.APP_TYPE_DROPDOWN_MOBILE_OPTION);
    }
    else if (appType === APP_TYPE.WEB) {
        cy.clickElement(applicationsPageElements.APP_TYPE_DROPDOWN_WEB_OPTION);
    }
    else if (appType === APP_TYPE.DESKTOP) {
        cy.clickElement(applicationsPageElements.APP_TYPE_DROPDOWN_DESKTOP_OPTION);
    }
};

// Create stays disabled until the form's validation has re-validated the field
// filled last (the country) and cly-form allows submission, a few ticks after
// the value is set. A click inside that window is dropped without a request.
// The click is forced (a toast can cover the button), so Cypress does not wait
// for "enabled" on its own: wait for it here, then for the create request, so
// the caller's search runs against an app list the new app is already in.
const clickCreateButton = () => {
    cy.intercept('GET', /\/i\/apps\/create(\?|$)/).as('createApp');
    // The form validates when the pointer enters the button's wrapper
    // (app-management.html: @mouseenter="formScope.validate()"), and the button
    // stays disabled until it has. A user hovers before clicking; without it the
    // button can wait on field-level validation alone and stay disabled.
    cy.getElement(applicationsPageElements.CREATE_BUTTON).eq(0).parent().trigger('mouseenter');
    cy.getElement(applicationsPageElements.CREATE_BUTTON).should('not.be.disabled');
    cy.getElement(applicationsPageElements.CREATE_BUTTON).eq(0).click({ force: true });
    cy.wait('@createApp').its('response.statusCode').should('eq', 200);
    cy.getElement(applicationsPageElements.CREATE_BUTTON).should('not.exist');
};

const searchApp = (appName) => {
    cy.typeInput(applicationsPageElements.LISTBOX_SEARCH_INPUT, appName);
};

const selectAppFromList = () => {
    cy.clickElement(applicationsPageElements.APP_LIST_ITEM);
};

const verifyCreatedApp = ({
    appName,
    appType,
    country,
    timeZone
}) => {

    cy.verifyElement({
        labelElement: applicationsPageElements.APPLICATION_NAME_VALUE_LABEL,
        labelText: appName,
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.APPLICATION_TYPE_VALUE_LABEL,
        labelText: helper.toSlug(appType),
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.COUNTRY_VALUE_LABEL,
        labelText: country,
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.TIMEZONE_VALUE_LABEL,
        labelText: timeZone,
    });

    cy.verifyElement({
        shouldNot: true,
        element: applicationsPageElements.APP_ID_VALUE_LABEL,
        elementText: null,
    });

    cy.verifyElement({
        shouldNot: true,
        element: applicationsPageElements.APP_KEY_VALUE_LABEL,
        elementText: null,
    });
};

const clickmoreOptionsButton = () => {
    cy.clickElement(applicationsPageElements.APP_PAGE_MORE_OPTIONS_BUTTON);
};

const verifyMoreOptionsElements = () => {

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_MORE_OPTIONS_BUTTON,
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_CLEAR_DATA_OLDER_THAN_ONE_MONTH_OPTION,
        elementText: "Clear data older than 1 month",
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_CLEAR_DATA_OLDER_THAN_THREE_MONTH_OPTION,
        elementText: "Clear data older than 3 months",
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_CLEAR_DATA_OLDER_THAN_SIX_MONTH_OPTION,
        elementText: "Clear data older than 6 months",
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_CLEAR_DATA_OLDER_THAN_ONE_YEAR_OPTION,
        elementText: "Clear data older than 1 year",
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_CLEAR_DATA_OLDER_THAN_TWO_YEAR_OPTION,
        elementText: "Clear data older than 2 years",
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_CLEAR_ALL_DATA_OPTION,
        elementText: "Clear all data",
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_RESET_APP_OPTION,
        elementText: "Reset application",
    });

    cy.verifyElement({
        element: applicationsPageElements.APP_PAGE_DELETE_APP_OPTION,
        elementText: "Delete application",
    });
};

const clickDeleteAppOption = () => {
    verifyMoreOptionsElements();
    cy.clickElement(applicationsPageElements.APP_PAGE_DELETE_APP_OPTION);
};

const verifyDeleteAppPopupElements = () => {
    cy.verifyElement({
        labelElement: applicationsPageElements.DELETE_APP_POPUP_TITLE_LABEL,
        labelText: "Delete application?",
    });

    cy.verifyElement({
        element: applicationsPageElements.DELETE_APP_POPUP_CLOSE_BUTTON,
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.DELETE_APP_POPUP_DESCRIPTION_LABEL,
        labelText: "You are about to delete all the data associated with your application. Do you want to continue?",
    });

    cy.verifyElement({
        element: applicationsPageElements.DELETE_APP_POPUP_CANCEL_BUTTON,
        elementText: "No, don't delete",
    });

    cy.verifyElement({
        element: applicationsPageElements.DELETE_APP_POPUP_DELETE_BUTTON,
        elementText: "Yes, delete the app",
    });
};

// The delete's success handler switches the active app away from the deleted
// one, which can navigate to the new app's home some time after the request
// returns. Wait for the request, then reload: the reload drops that pending
// switch, so the caller's navigation is the last one.
const clickYesDeleteButton = () => {
    cy.intercept('GET', /\/i\/apps\/delete(\?|$)/).as('deleteApp');
    cy.getElement(applicationsPageElements.DELETE_APP_POPUP_DELETE_BUTTON).eq(0).click();
    cy.wait('@deleteApp').its('response.statusCode').should('eq', 200);
    cy.reload();
};

const verifyAppShouldBeDeleted = ()=> {
    cy.verifyElement({
        element: applicationsPageElements.NO_MATCHE_FOUND_LABEL,
        elementText: "No match found",
    });
};

const clickEditButton = () => {
    cy.clickElement(applicationsPageElements.APP_PAGE_EDIT_BUTTON);
};

const verifyEditPopupElements = () => {

    cy.verifyElement({
        element: applicationsPageElements.EDIT_PAGE_NUMBER_OF_CHANGES,
        elementText: "3",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.EDIT_POPUP_CHANGE_HAS_BEEN_MADE_LABEL,
        labelText: "changes have been made.",
    });

    cy.verifyElement({
        labelElement: applicationsPageElements.EDIT_POPUP_DO_YOU_WANNA_KEEP_LABEL,
        labelText: "Do you want to keep them?",
    });

    cy.verifyElement({
        element: applicationsPageElements.EDIT_POPUP_SAVE_CHANGES_BUTTON,
        elementText: "Save Changes",
    });

    cy.verifyElement({
        element: applicationsPageElements.EDIT_POPUP_CLOSE_BUTTON,
    });
};

const clickSaveChangesButton = () => {
    cy.intercept('GET', /\/i\/apps\/update(\?|$)/).as('updateApp');
    cy.getElement(applicationsPageElements.EDIT_POPUP_SAVE_CHANGES_BUTTON).eq(0).click();
    cy.wait('@updateApp').its('response.statusCode').should('eq', 200);
    cy.getElement(applicationsPageElements.APP_NAME_INPUT).should('not.exist');
};

const uploadAppIcon = (filePath) => {
    cy.uploadFile(filePath);
};

const verifyChangesSavedNotification = () => {
    cy.verifyElement({
        element: applicationsPageElements.EDIT_NOTIFICATION_MESSAGE,
        elementText: "Changes were successfully saved",
    });
};

const searchCountry = (country) => {
    cy.typeInput(applicationsPageElements.COUNTRY_SEARCH_INPUT, country);
};

const selectCountry = (country) => {
    cy.clickElement(applicationsPageElements.COUNTRY_DROPDOWN);
    searchCountry(country);

    if (country === "Turkey") {
        cy.clickElement(applicationsPageElements.DROPDOWN_OPTION_TURKEY);
    }
    else if (country === "United Kingdom") {
        cy.clickElement(applicationsPageElements.DROPDOWN_OPTION_UNITED_KINGDOM);
    }
};

module.exports = {
    verifyPageElements,
    clickAddNewAppButton,
    typeAppName,
    clickCreateButton,
    searchApp,
    verifyCreatedApp,
    selectAppFromList,
    selectAppType,
    clickmoreOptionsButton,
    clickDeleteAppOption,
    verifyDeleteAppPopupElements,
    clickYesDeleteButton,
    verifyAppShouldBeDeleted,
    clickEditButton,
    verifyEditPopupElements,
    clickSaveChangesButton,
    uploadAppIcon,
    verifyChangesSavedNotification,
    selectCountry
};
