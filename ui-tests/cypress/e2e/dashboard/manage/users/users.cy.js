import user from '../../../../fixtures/user.json';
const navigationHelpers = require('../../../../support/navigations');
const loginHelpers = require('../../../../lib/login/login');
const usersHelper = require('../../../../lib/dashboard/manage/users/users');
const { generateUsersFixture } = require('../../../../fixtures/generators/users');
const { USER_TYPE } = require('../../../../support/constants');


describe('Create users with different types such as User, Admin and Global Admin ', () => {
    beforeEach(function() {
        navigationHelpers.goToLoginPage();
        loginHelpers.login(user.username, user.password);
        navigationHelpers.goToUserManagementPage();
    });

    it('Create a User', function() {
        const users = generateUsersFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
            usersHelper.clickCreateNewUserButton();
            // TODO: SER-2348
            //  usersHelper.uploadImage(users.logoPath);
            usersHelper.typeFullName(users.fullName);
            usersHelper.typeUserName(users.userName);
            usersHelper.typePassword(users.password);
            usersHelper.typeEmail(users.email);
            usersHelper.selectAppForUser(application);
            usersHelper.clickCreateUserButton();
            usersHelper.verifySavedNotification();

            usersHelper.searchUserOnDataTable(users.fullName);
            usersHelper.verifyUsersDataFromTable({
                user: users.fullName,
                role: USER_TYPE.USER,
                email: users.email,
                lastLogin: 'Not logged in yet'
            });
        });
    });

    it('Create an Admin user', function() {
        const users = generateUsersFixture();
        let application = "";

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            application = appName;
            usersHelper.clickCreateNewUserButton();
            usersHelper.typeFullName(users.fullName);
            usersHelper.typeUserName(users.userName);
            usersHelper.typePassword(users.password);
            usersHelper.typeEmail(users.email);
            usersHelper.selectAppForAdmin(application);
            usersHelper.clickCreateUserButton();
            usersHelper.verifySavedNotification();

            usersHelper.searchUserOnDataTable(users.fullName);
            usersHelper.verifyUsersDataFromTable({
                user: users.fullName,
                role: USER_TYPE.ADMIN,
                email: users.email,
                lastLogin: 'Not logged in yet'
            });
        });
    });

    it('Create a Global Admin user', function() {
        const users = generateUsersFixture();

        usersHelper.clickCreateNewUserButton();
        usersHelper.typeFullName(users.fullName);
        usersHelper.typeUserName(users.userName);
        usersHelper.clickGeneratePasswordButton();
        usersHelper.typeEmail(users.email);
        usersHelper.clickGlobalAdministratorButton();
        usersHelper.clickCreateUserButton();
        usersHelper.verifySavedNotification();

        usersHelper.searchUserOnDataTable(users.fullName);
        usersHelper.verifyUsersDataFromTable({
            user: users.fullName,
            role: USER_TYPE.GLOBAL_USER,
            email: users.email,
            lastLogin: 'Not logged in yet'
        });
    });
});