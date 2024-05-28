import user from '../../../../fixtures/user.json';
const loginHelpers = require('../../../../lib/login/login');
const navigationHelpers = require('../../../../support/navigations');
const analyticsLoyaltyUserActivityHelpers = require('../../../../lib/dashboard/analytics/loyalty/userActivity');

describe('Visitor Activity', () => {
    beforeEach(function() {
        navigationHelpers.goToLoginPage();
    });

    it('should be visible all elements on empty state', function() {
        loginHelpers.login(user.username, user.password);
        navigationHelpers.goToVisitorLoyalty();
        analyticsLoyaltyUserActivityHelpers.verifyEmptyPageElements();
    });
});
