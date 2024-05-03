import {
    userManagementPageElements,
    usersDataTableElements
}
    from "../../../../support/elements/dashboard/manage/users/users";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: userManagementPageElements.PAGE_TITLE,
        labelText: "Manage Users",
    });

    cy.verifyElement({
        element: userManagementPageElements.CREATE_USER_BUTTON,
        elementText: "Create User",
    });

    cy.verifyElement({
        element: userManagementPageElements.FILTER_USER_TYPE_SELECT,
        elementText: "All roles",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: usersDataTableElements(0).INTERNAL_NAME,
        elementText: "Global Admin",
    });
};

module.exports = {
    verifyEmptyPageElements
};