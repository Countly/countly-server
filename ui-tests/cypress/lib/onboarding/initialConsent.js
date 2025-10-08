import initialConsentPageElements from "../../support/elements/onboarding/initialConsent";

const subscribeToNewsletter = () => {
    cy.clickElement(initialConsentPageElements.ENABLE_NEWSLETTER_RADIO_BUTTON);
};

const dontSubscribeToNewsletter = () => {
    cy.clickElement(initialConsentPageElements.DONT_ENABLE_NEWSLETTER_RADIO_BUTTON);
};

const clickContinue = () => {
    cy.clickElement(initialConsentPageElements.CONTINUE_BUTTON);
};

const verifyDefaultPageElements = () => {

    cy.checkPaceRunning();

    cy.verifyElement({
        element: initialConsentPageElements.LOGO,
    });

    cy.verifyElement({
        labelElement: initialConsentPageElements.PAGE_TITLE,
        labelText: "Before we start..."
    });

    cy.verifyElement({
        labelElement: initialConsentPageElements.PAGE_DESC_NEWSLETTER,
        labelText: "We offer a newsletter brimming with recent updates about our product, news from Countly, and information on product analytics. We assure you - our aim is to provide value and insights, not clutter your inbox with unwanted emails."
    });

    cy.verifyElement({
        labelElement: initialConsentPageElements.PAGE_QUESTION_NEWSLETTER,
        labelText: "Would you be interested in subscribing to our newsletter?"
    });

    cy.verifyElement({
        element: initialConsentPageElements.ENABLE_NEWSLETTER_RADIO_BUTTON,
        //isChecked: true,
        labelElement: initialConsentPageElements.ENABLE_NEWSLETTER_RADIO_BUTTON_LABEL,
        labelText: "Yes, subscribe me to the newsletter"
    });

    cy.verifyElement({
        element: initialConsentPageElements.DONT_ENABLE_NEWSLETTER_RADIO_BUTTON,
        //isChecked: true,
        labelElement: initialConsentPageElements.DONT_ENABLE_NEWSLETTER_RADIO_BUTTON_LABEL,
        labelText: "No, thank you"
    });

    cy.verifyElement({
        element: initialConsentPageElements.CONTINUE_BUTTON,
        elementText: "Continue",
    });
};

const completeOnboardingInitialConsent = ({
    isSubscribeToNewsletter,
}) => {
    isSubscribeToNewsletter ? subscribeToNewsletter() : dontSubscribeToNewsletter();
    clickContinue();
};

module.exports = {
    subscribeToNewsletter,
    dontSubscribeToNewsletter,
    verifyDefaultPageElements,
    clickContinue,
    completeOnboardingInitialConsent
};