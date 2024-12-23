import {
    usersPageElements,
    usersDataTableElements
} from "../../../../support/elements/dashboard/manage/users/users";

import user from '../../../../fixtures/user.json';

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

    // verifyUsersDataFromTable({
    //     index: 0,
    //     user: user.username,
    //     role: "Global Admin",
    //     email: user.email,
    //     lastLogin: "2 minutes ago"
    // });
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

module.exports = {
    verifyPageElements,
    verifyUsersDataFromTable
};