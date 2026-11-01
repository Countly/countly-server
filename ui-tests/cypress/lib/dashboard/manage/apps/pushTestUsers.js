import pushTestUsersElements from '../../../../support/elements/dashboard/manage/apps/pushTestUsers';

const LIST_DIALOG_TITLE = 'push-test-users-list-dialog-cly-dialog-title-label';

const openPushSettings = () => {
    cy.contains('.el-collapse-item__header', 'Push Notifications')
        .scrollIntoView()
        .click();
    cy.shouldBeVisible(pushTestUsersElements.DEFINE_NEW_USER_BUTTON);
};

const clickDefineNewUser = () => {
    cy.clickElement(pushTestUsersElements.DEFINE_NEW_USER_BUTTON);
    cy.shouldBeVisible(pushTestUsersElements.USER_SELECT);
};

const verifyOnlyUserIdDefinition = () => {
    cy.shouldBeVisible(pushTestUsersElements.DEFINITION_USER_ID_RADIO);
    cy.shouldNotExist(pushTestUsersElements.DEFINITION_COHORT_RADIO);
};

const searchUsers = (text) => {
    cy.getElement(pushTestUsersElements.USER_SELECT)
        .find('input.el-select__input')
        .clear({ force: true })
        .type(text, { force: true });
};

const verifySearchOptions = (dids, excludedDids = []) => {
    dids.forEach((did) => {
        cy.shouldBeVisible(pushTestUsersElements.USER_OPTION(did));
    });
    excludedDids.forEach((did) => {
        cy.shouldNotExist(pushTestUsersElements.USER_OPTION(did));
    });
};

const selectUser = (did) => {
    cy.clickElement(pushTestUsersElements.USER_OPTION(did));
};

const clickAddUsers = () => {
    cy.clickElement(pushTestUsersElements.DRAWER_SAVE_BUTTON);
    cy.contains('Test users have been successfully added').should('be.visible');
};

const openUserList = () => {
    cy.clickElement(pushTestUsersElements.SEE_USER_LIST_LINK);
    cy.shouldBeVisible(LIST_DIALOG_TITLE);
};

const listDialog = () => cy.getElement(LIST_DIALOG_TITLE).closest('.el-dialog');

const verifyListedUsers = (dids) => {
    listDialog().find('.el-table__body tr.el-table__row').should('have.length', dids.length);
    dids.forEach((did) => {
        listDialog().find('.el-table__body').should('contain.text', did);
    });
};

const verifyListTypeOptions = (labels) => {
    cy.clickElement(pushTestUsersElements.LIST_TYPE_SELECT);
    cy.get('.el-select-dropdown:visible .el-select-dropdown__item').should('have.length', labels.length);
    labels.forEach((label) => {
        cy.get('.el-select-dropdown:visible').should('contain.text', label);
    });
    cy.clickElement(pushTestUsersElements.LIST_TYPE_SELECT);
};

const removeListedUser = (did) => {
    listDialog().contains('.el-table__body td', did).trigger('mouseenter');
    cy.clickElement(pushTestUsersElements.ROW_MORE_BUTTON);
    cy.clickElement(pushTestUsersElements.ROW_DELETE_BUTTON, true);
    cy.contains('Test users have been successfully removed').should('be.visible');
};

module.exports = {
    openPushSettings,
    clickDefineNewUser,
    verifyOnlyUserIdDefinition,
    searchUsers,
    verifySearchOptions,
    selectUser,
    clickAddUsers,
    openUserList,
    verifyListedUsers,
    verifyListTypeOptions,
    removeListedUser,
};
