import initialConsentPageElements from "../../support/elements/onboarding/initialConsent";

const enableTracking = () => {
    cy.clickElement(initialConsentPageElements.ENABLE_TRACKING_RADIO_BUTTON);
};

const dontEnableTracking = () => {
    cy.clickElement(initialConsentPageElements.DONT_ENABLE_TRACKING_RADIO_BUTTON);
};

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
        labelElement: initialConsentPageElements.PAGE_DESC_TRACKING,
        labelText: "We utilize Countly to understand user interactions and collect feedback, helping us enhance our product continuously. However, your privacy remains our priority. This analysis is done on the server level, so we won't see or collect any individual details or any data you record. The data is reported back only to our dedicated Countly server based in Europe. Please note, you can change your mind at any time in the settings."
    });

    cy.verifyElement({
        labelElement: initialConsentPageElements.PAGE_QUESTION_TRACKING,
        labelText: "Considering our commitment to maintaining your privacy and the potential benefits for product enhancement, would you be comfortable enabling Countly on this server?"
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
        element: initialConsentPageElements.ENABLE_TRACKING_RADIO_BUTTON,
        isChecked: true,
        labelElement: initialConsentPageElements.ENABLE_TRACKING_RADIO_BUTTON_LABEL,
        labelText: "Yes, enable tracking on this server"
    });

    cy.verifyElement({
        element: initialConsentPageElements.DONT_ENABLE_TRACKING_RADIO_BUTTON,
        isChecked: false,
        labelElement: initialConsentPageElements.DONT_ENABLE_TRACKING_RADIO_BUTTON_LABEL,
        labelText: "No, maybe later"
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
    isEnableTacking,
    isSubscribeToNewsletter,
}) => {
    isEnableTacking ? enableTracking() : dontEnableTracking();
    isSubscribeToNewsletter ? subscribeToNewsletter() : dontSubscribeToNewsletter();
    clickContinue();
};

module.exports = {
    enableTracking,
    dontEnableTracking,
    subscribeToNewsletter,
    dontSubscribeToNewsletter,
    verifyDefaultPageElements,
    clickContinue,
    completeOnboardingInitialConsent
};