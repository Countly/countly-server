/* eslint-disable no-undef */
const navigationHelpers = require('../../support/navigations');
const setupHelpers = require('../../lib/onboarding/setup');
const initialSetupHelpers = require('../../lib/onboarding/initialSetup');
const initialConsentHelpers = require('../../lib/onboarding/initialConsent');
const quickstartPopoeverHelpers = require('../../support/components/quickstartPopover');

const wait_L = 4000;
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
    cy.wait(wait_L);
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
    cy.get('.white-bg > :nth-child(4)').click({force: true});
    cy.wait(2000);
    cy.get('.white-bg > :nth-child(1) > a > span').click({force: true});
    cy.wait(2000);
    cy.get('.white-bg > :nth-child(4)').click({force: true});
    cy.wait(2000);
};

const createRequest = (sdkName, sdkVersion) => {
    return 'http://localhost:3001/i?app_key=1&device_id=1&begin_session=1&sdk_name=' + sdkName + '&sdk_version=' + sdkVersion;
};

const checkTooltipAppears = (tooltip, count, early) => {
    const expectedCount = count ? count : 28;
    const selectorForState = '.sdk-support-text.tooltip-' + tooltip;

    cy.get(selectorForState).should('have.length', expectedCount)
        .each(($el) => {
            const text = $el.text().trim();
            expect(text.length, 'support text should not be empty').to.be.greaterThan(0);
        });

    if (early) {
        return;
    }
};

module.exports = {
    setupTest,
    goToConfigTab,
    checkTooltipAppears,
    createRequest
};