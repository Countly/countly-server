import user from '../../fixtures/user.json';
const navigationHelpers = require('../../support/navigations');
const setupHelpers = require('../../lib/onboarding/setup');
const initialSetupHelpers = require('../../lib/onboarding/initialSetup');
const initialConsentHelpers = require('../../lib/onboarding/initialConsent');
const { APP_TYPE, DATA_TYPE } = require('../../support/constants');

describe('Complete Onboarding', () => {
    beforeEach(function() {
        navigationHelpers.goToLoginPage();
    });

    afterEach(function() {
        cy.dropMongoDatabase();
    });

    it('should be complete onboarding flow with creating demo application', function() {
        setupHelpers.verifyDefaultPageElements;
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: true
        });

        initialSetupHelpers.verifyDefaultPageElements(true);
        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: true,
            appType: APP_TYPE.WEB,
            demoAppData: DATA_TYPE.ECOMMERCE,
            timezone: 'Troll'
        });

        initialConsentHelpers.verifyDefaultPageElements();
        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: false,
            isSubscribeToNewsletter: false
        });
        navigationHelpers.isNavigatedToDashboard();
    });

    it('should be complete onboarding flow with creating own application', function() {
        setupHelpers.verifyDefaultPageElements;
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: false
        });

        initialSetupHelpers.verifyDefaultPageElements(false);
        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: false,
            appType: APP_TYPE.WEB,
            appName: 'My Little App',
            appKey: 'aaaaabe5c377f6ab830890e9d7d416970f5541a4',
            timezone: 'Troll'
        });

        initialConsentHelpers.verifyDefaultPageElements();
        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: false,
            isSubscribeToNewsletter: false
        });
        navigationHelpers.isNavigatedToDashboard();
    });
});
