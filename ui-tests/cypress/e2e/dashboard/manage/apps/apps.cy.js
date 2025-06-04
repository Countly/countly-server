import user from '../../../../fixtures/user.json';
const navigationHelpers = require('../../../../support/navigations');
const loginHelpers = require('../../../../lib/login/login');
const appHelper = require('../../../../lib/dashboard/manage/apps/apps');
const { generateAppsFixture } = require('../../../../fixtures/generators/apps');
const { APP_TYPE } = require('../../../../support/constants');

describe('Create apps with different types such as Desktop, Mobile, and Web. ', () => {
    beforeEach(function () {
        navigationHelpers.goToLoginPage();
        loginHelpers.login(user.username, user.password);
        navigationHelpers.goToApplicationsPage();
    });

    it('Create a mobile type app with icon.', function () {

        const app = generateAppsFixture();
        appHelper.clickAddNewAppButton();
        appHelper.typeAppName(app.appName);
        appHelper.selectAppType(APP_TYPE.MOBILE);
        appHelper.clickCreateButton();

        appHelper.searchApp(app.appName);
        appHelper.selectAppFromList();

        appHelper.verifyCretedApp({
            appName: app.appName,
            appType: APP_TYPE.MOBILE,
        });

        //add icon case
        appHelper.uploadAppIcon(app.logoPath);ƒ
    })

    it('Create a desktop type app without icon and update the name and app type.', function () {

        const app = generateAppsFixture();
        appHelper.clickAddNewAppButton();
        appHelper.typeAppName(app.appName);
        appHelper.selectAppType(APP_TYPE.DESKTOP);
        appHelper.clickCreateButton();

        appHelper.searchApp(app.appName);
        appHelper.verifyCretedApp({
            appName: app.appName,
            appType: APP_TYPE.DESKTOP,
        });

        //update app case
        const updatedName = generateAppsFixture();

        appHelper.clickEditButton();
        appHelper.typeAppName(updatedName.appName);
        appHelper.selectAppType(APP_TYPE.MOBILE);
        appHelper.verifyEditPopupElements();
        appHelper.clickSaveChangesButton();
    
        appHelper.searchApp(updatedName.appName);
        appHelper.selectAppFromList();

        appHelper.verifyCretedApp({
            appName: updatedName.appName,
            appType: APP_TYPE.MOBILE,
        });

        appHelper.verifyCahangesShouldBeMade();
    })

    it('Create a web type app without icon and delete it.', function () {

        const app = generateAppsFixture();
        appHelper.clickAddNewAppButton();
        appHelper.typeAppName(app.appName);
        appHelper.selectAppType(APP_TYPE.WEB);
        appHelper.clickCreateButton();

        appHelper.searchApp(app.appName);
        appHelper.verifyCretedApp({
            appName: app.appName,
            appType: APP_TYPE.WEB,
        });

        //delete app case
        appHelper.clickmoreOptionsButton();
        appHelper.clickDeleteAppOption();
        appHelper.verifyDeleteAppPopupElements();
        appHelper.clickYesDeleteButton();
        appHelper.searchApp(app.appName);
        appHelper.verifyAppShouldBeDleted();

    })
});