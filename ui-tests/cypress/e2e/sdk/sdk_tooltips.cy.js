const navigationHelpers = require('../../support/navigations');
const setupHelpers = require('../../lib/onboarding/setup');
const initialSetupHelpers = require('../../lib/onboarding/initialSetup');
const initialConsentHelpers = require('../../lib/onboarding/initialConsent');
const quickstartPopoeverHelpers = require('../../support/components/quickstartPopover');

const wait_L = 4000;

/**
 * Structure of tests:
 * 1. Neutral tooltip (default in app creation)
 * 2. Warning tooltip (old Web SDK version)
 * 3. Success tooltip (latest Web SDK version)
 * 4. Mixed tooltip (old Android SDK version)
 * 5. Mixed tooltip (old iOS SDK version)
 * 6. Danger tooltip (unsupported SDK)
 * 7. Success tooltip (latest Android SDK version)
 * 8. Success tooltip (latest iOS SDK version)
 * 9. Mixed tooltip (multiple SDK versions)
 */
describe('SDK Tooltips Tests', () => {
    const user = {
        username: 'test',
        email: 'a@a.com',
        password: '111111111aA/'
    };
    beforeEach(function() {
        cy.dropMongoDatabase(); // true in local tests
        navigationHelpers.goToLoginPage();
        setupHelpers.completeOnboardingSetup({
            fullName: user.username,
            emailAddress: user.email,
            password: user.password,
            confirmPassword: user.password,
            isDemoApp: false
        });
        initialSetupHelpers.completeOnboardingInitialSetup({
            isDemoApp: false,
            appType: 'Mobile',
            appName: 'My Mobile App',
            appKey: '1',
            timezone: 'Seoul'
        });
        initialConsentHelpers.completeOnboardingInitialConsent({
            isEnableTacking: false,
            isSubscribeToNewsletter: false
        });
        navigationHelpers.isNavigatedToDashboard();
    });

    afterEach(function() {
        // cy.dropMongoDatabase(true);
    });

    it('1-Should display neutral tooltips with no data', function() {
        goToConfigTab();
        checkTooltipAppears('neutral');
    });
    it('2-Warning for old Web SDK version', function() {
        cy.request('GET', createRequest('javascript_native_web', '19.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('warning');
            });
    });
    it('3-Success for latest Web SDK version', function() {
        cy.request('GET', createRequest('javascript_native_web', '25.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('success');
            });
    });
    it('4-Mixed for old Android SDK version', function() {
        cy.request('GET', createRequest('java-native-android', '23.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('success', 2, true);
                checkTooltipAppears('warning', 19, true);
            });
    });
    it('5-Mixed for old iOS SDK version', function() {
        cy.request('GET', createRequest('objc-native-ios', '24.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('success', 2, true);
                checkTooltipAppears('warning', 19, true);
            });
    });
    it('6-Unsupported SDK should display warning', function() {
        cy.request('GET', createRequest('unity', '25.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('danger');
            });
    });
    it('7-Success for latest Android SDK version', function() {
        cy.request('GET', createRequest('java-native-android', '25.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('success');
            });
    });
    it('8-Success for latest iOS SDK version', function() {
        cy.request('GET', createRequest('objc-native-ios', '25.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('success');
            });
    });
    it('9-Multi SDK versions', function() {
        cy.request('GET', createRequest('a', '26.12.1'));
        cy.request('GET', createRequest('javascript_native_web', '25.12.1v2'));
        cy.request('GET', createRequest('java-native-android', '22.12.1'));
        cy.request('GET', createRequest('objc-native-ios-rc2', '24.12.1'))
            .then((response) => {
                goToConfigTab();
                checkTooltipAppears('success', 2, true);
                checkTooltipAppears('warning', 19, true);
            });
    });
});

// sample request to send sdk data in local tests:
//'http://localhost:3001/i?app_key=1&device_id=1&begin_session=1&sdk_name=javascript_native_web&sdk_version=19.12.1';
function createRequest(sdkName, sdkVersion) {
    return 'http://localhost:3001/i?app_key=1&device_id=1&begin_session=1&sdk_name=' + sdkName + '&sdk_version=' + sdkVersion;

}

function goToConfigTab() {
    cy.wait(wait_L);
    quickstartPopoeverHelpers.closeQuickStartPopover();
    navigationHelpers.goToSdkManagerPage();
    cy.get('.white-bg > :nth-child(4)').click();
    cy.wait(wait_L);
    cy.get('.white-bg > :nth-child(1) > a > span').click();
    cy.wait(wait_L);
    cy.get('.white-bg > :nth-child(4)').click();
}

function checkTooltipAppears(tooltip, count, early) {
    cy.wait(500);
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-' + tooltip).should('have.length', count ? count : 21);

    if (early) {
        return;
    }

    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-neutral').should(tooltip == 'neutral' ? 'be.visible' : 'not.exist');
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-warning').should(tooltip == 'warning' ? 'be.visible' : 'not.exist');
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-danger').should(tooltip == 'danger' ? 'be.visible' : 'not.exist');
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-success').should(tooltip == 'success' ? 'be.visible' : 'not.exist');
}