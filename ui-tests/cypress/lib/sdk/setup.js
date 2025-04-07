/* eslint-disable no-undef */
const navigationHelpers = require('../../support/navigations');
const setupHelpers = require('../../lib/onboarding/setup');
const initialSetupHelpers = require('../../lib/onboarding/initialSetup');
const initialConsentHelpers = require('../../lib/onboarding/initialConsent');
const quickstartPopoeverHelpers = require('../../support/components/quickstartPopover');

const wait_L = 1000;
const user = {
    username: 'test',
    email: 'a@a.com',
    password: '111111111aA/'
};

const setupTest = () => {
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
};

const goToConfigTab = (nopop) => {
    cy.visit('/login');
    cy.get(':nth-child(3) > input').type(user.email);
    cy.get(':nth-child(4) > input').type(user.password);
    cy.get('#login-button').click();
    cy.url().then(url => {
        if (url.includes('not-responded-consent')) {
            cy.get('[data-test-id="dont-enable-tracking-el-radio-wrapper"] > .el-radio__input > .el-radio__inner').click();
            cy.get('.el-button > span').click();
        }
    });
    cy.wait(wait_L);
    cy.reload(true);
    cy.wait(wait_L);
    if (!nopop) {
        quickstartPopoeverHelpers.closeQuickStartPopover();
    }
    navigationHelpers.goToSdkManagerPage();
    cy.get('.white-bg > :nth-child(4)').click();
    cy.get('.white-bg > :nth-child(1) > a > span').click();
    cy.wait(wait_L);
    cy.get('.white-bg > :nth-child(4)').click();
};

const createRequest = (sdkName, sdkVersion) => {
    return 'http://localhost:3001/i?app_key=1&device_id=1&begin_session=1&sdk_name=' + sdkName + '&sdk_version=' + sdkVersion;
};

const checkTooltipAppears = (tooltip, count, early) => {
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-' + tooltip).should('have.length', count ? count : 21);

    if (early) {
        return;
    }

    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-neutral').should(tooltip == 'neutral' ? 'be.visible' : 'not.exist');
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-warning').should(tooltip == 'warning' ? 'be.visible' : 'not.exist');
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-danger').should(tooltip == 'danger' ? 'be.visible' : 'not.exist');
    cy.get('.cly-vue-tooltip-icon.ion.ion-help-circled.tooltip-success').should(tooltip == 'success' ? 'be.visible' : 'not.exist');
};

module.exports = {
    setupTest,
    goToConfigTab,
    checkTooltipAppears,
    createRequest
};