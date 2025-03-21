import {
    usersPageElements,
    usersDataTableElements,
    usersCreationPageElements
} from "../../../../support/elements/dashboard/manage/users/users";

import user from '../../../../fixtures/user.json';
const helper = require('../../../../support/helper');
const { USER_TYPE } = require('../../../../support/constants');

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: usersPageElements.PAGE_TITLE,
        labelText: "Manage Users",
    });

    cy.verifyElement({
        element: usersPageElements.CREATE_USER_BUTTON,
        elementText: "Create User",
    });

    cy.verifyElement({
        element: usersPageElements.FILTER_USER_TYPE_SELECT,
        elementText: "All roles",
    });

    cy.verifyElement({
        element: usersDataTableElements().EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: usersDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: usersDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_USER_LABEL,
        labelText: "User",
    });

    cy.verifyElement({
        element: usersDataTableElements().COLUMN_NAME_USER_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_ROLE_LABEL,
        labelText: "Role",
    });

    cy.verifyElement({
        element: usersDataTableElements().COLUMN_NAME_ROLE_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_EMAIL_LABEL,
        labelText: "E-mail",
    });

    cy.verifyElement({
        element: usersDataTableElements().COLUMN_NAME_EMAIL_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_LAST_LOGIN_LABEL,
        labelText: "Last Login",
    });

    cy.verifyElement({
        element: usersDataTableElements().COLUMN_NAME_LAST_LOGIN_SORTABLE_ICON,
    });
};

const verifyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyUsersDataFromTable({
        index: 0,
        user: user.username,
        role: USER_TYPE.GLOBAL_USER,
        email: user.email,
        lastLogin: "2 minutes ago"
    });
};

const verifyUsersDataFromTable = ({
    index = 0,
    user = null,
    role = null,
    email = null,
    lastLogin = null
}) => {

    cy.verifyElement({
        labelElement: usersDataTableElements(index).USER,
        labelText: user,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements(index).ROLE,
        labelText: role,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements(index).EMAIL,
        labelText: email,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements(index).LAST_LOGIN,
        labelText: lastLogin,
    });
};

const clickCreateNewUserButton = () =>{
    cy.clickElement(usersPageElements.CREATE_USER_BUTTON);
};

const typeFullName = (fullName) => {
    cy.typeInput(usersCreationPageElements().FULL_NAME_INPUT, fullName);
};

const typeUserName = (userName) => {
    cy.typeInput(usersCreationPageElements().USER_NAME_INPUT, userName);
};

const clickGeneratePasswordButton = () =>{
    cy.clickElement(usersCreationPageElements().GENERATE_PASSWORD_BUTTON);
};

const typePassword = (password) => {
    cy.typeInput(usersCreationPageElements().PASSWORD_INPUT, password);
};

const typeEmail = (email) => {
    cy.typeInput(usersCreationPageElements().EMAIL_INPUT, email);
};

const clickCreateUserButton = () =>{
    cy.clickElement(usersCreationPageElements().DRAWER_CREATE_BUTTON, true);
};

const clickGlobalAdministratorButton = () =>{
    cy.clickElement(usersCreationPageElements().GLOBAL_ADMINISTRATOR_CHECKBOX_LABEL);
};

const verifyserSavedNotification = () => {
    cy.verifyElement({
        labelElement: usersCreationPageElements().NOTIFICATION_USER_SAVED_MESSAGE,
        labelText: "User created successfully!"
    });
};

const searchUserOnDataTable = (userName) => {
    cy.typeInput(usersCreationPageElements().TABLE_SEARCH_INPUT, userName);
};

const selectAppForUser = (application) => {
    cy.clickElement(usersCreationPageElements().GRANT_USER_ACCESS_TO_APP_DROPDOWN);
    cy.clickElement(usersCreationPageElements(helper.toSlug(application)).USER_ACCESS_TO_APP_DROPDOWN);
};

const selectAppForAdmin = (application) => {
    cy.clickElement(usersCreationPageElements().GRANT_ADMIN_ACCESS_TO_APP_DROPDOWN);
    cy.clickElement(usersCreationPageElements(helper.toSlug(application)).ADMIN_ACCESS_TO_APP_DROPDOWN);
};

// TODO: SER-2348
// const uploadImage = (uploadImage) => {
//     cy.uploadFile(usersCreationPageElements().UPLOAD_IMAGE_DROPZONE, uploadImage);
// };

module.exports = {
    verifyPageElements,
    verifyUsersDataFromTable,
    clickCreateNewUserButton,
    typeFullName,
    typeUserName,
    clickGeneratePasswordButton,
    typeEmail,
    typePassword,
    selectAppForUser,
    clickCreateUserButton,
    clickGlobalAdministratorButton,
    verifyserSavedNotification,
    searchUserOnDataTable,
    selectAppForAdmin,
    // TODO: SER-2348
    //uploadImage
};