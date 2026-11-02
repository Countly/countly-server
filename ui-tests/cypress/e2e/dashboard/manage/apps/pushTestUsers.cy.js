import user from '../../../../fixtures/user.json';
const base64 = require('base-64');
const navigationHelpers = require('../../../../support/navigations');
const loginHelpers = require('../../../../lib/login/login');
const appHelper = require('../../../../lib/dashboard/manage/apps/apps');
const pushTestUsersHelper = require('../../../../lib/dashboard/manage/apps/pushTestUsers');

// Push test users in Countly Lite: without drill & user profiles the app settings pick
// test users through push's own device ID search (o/push/test-users), with no cohorts.
describe('Push test users without drill and user profiles', () => {
    const uniq = Date.now();
    const appName = 'push-test-users-' + uniq;
    const dids = {
        pixel: 'qa-pixel-' + uniq,
        galaxy: 'qa-galaxy-' + uniq,
        iphone: 'dev-iphone-' + uniq,
        prod: 'prod-user-' + uniq,
    };
    let apiKey = '';
    let appId = '';

    before(() => {
        cy.request({
            method: 'GET',
            url: '/api-key',
            headers: {
                accept: 'text/plain',
                authorization: `Basic ${base64.encode(user.username + ":" + user.password)}`,
            },
        }).then((keyResponse) => {
            apiKey = keyResponse.body;
            return cy.request(`/i/apps/create?api_key=${apiKey}&args=${encodeURIComponent(JSON.stringify({name: appName, type: 'mobile', country: 'TR', timezone: 'Europe/Istanbul'}))}`);
        }).then((appResponse) => {
            appId = appResponse.body._id;
            Object.values(dids).forEach((did) => {
                cy.request(`/i?app_key=${appResponse.body.key}&device_id=${did}&begin_session=1`);
            });
        });
    });

    after(() => {
        if (appId) {
            cy.request(`/i/apps/delete?api_key=${apiKey}&args=${encodeURIComponent(JSON.stringify({app_id: appId}))}`);
        }
    });

    beforeEach(() => {
        navigationHelpers.goToLoginPage();
        loginHelpers.login(user.username, user.password);
        navigationHelpers.goToApplicationsPage();
        appHelper.searchApp(appName);
        appHelper.selectAppFromList();
        pushTestUsersHelper.openPushSettings();
    });

    it('adds test users found by part of their device ID', () => {
        pushTestUsersHelper.clickDefineNewUser();
        pushTestUsersHelper.verifyOnlyUserIdDefinition();

        pushTestUsersHelper.searchUsers('qa-');
        pushTestUsersHelper.verifySearchOptions([dids.galaxy, dids.pixel], [dids.iphone, dids.prod]);
        pushTestUsersHelper.selectUser(dids.galaxy);
        pushTestUsersHelper.selectUser(dids.pixel);

        pushTestUsersHelper.searchUsers('IPHONE');
        pushTestUsersHelper.verifySearchOptions([dids.iphone], [dids.prod]);
        pushTestUsersHelper.selectUser(dids.iphone);

        pushTestUsersHelper.clickAddUsers();
    });

    it('lists the test users by device ID and removes one', () => {
        pushTestUsersHelper.openUserList();
        pushTestUsersHelper.verifyListTypeOptions(['User ID']);
        pushTestUsersHelper.verifyListedUsers([dids.pixel, dids.galaxy, dids.iphone]);

        pushTestUsersHelper.removeListedUser(dids.galaxy);
        pushTestUsersHelper.verifyListedUsers([dids.pixel, dids.iphone]);
    });
});
