import setupPageElements from '../../support/elements/onboarding/setup';

const typeFullName = (fullName) => {
    cy.typeInput(setupPageElements.FULL_NAME_INPUT, fullName);
};

const typeEmailAddress = (emailAddress) => {
    cy.typeInput(setupPageElements.EMAIL_ADDRESS_INPUT, emailAddress);
};

const typePassword = (password) => {
    cy.typeInput(setupPageElements.PASSWORD_INPUT, password);
};

const typeConfirmPassword = (confirmPassword) => {
    cy.typeInput(setupPageElements.CONFIRM_PASSWORD_INPUT, confirmPassword);
};

const clickContinueWithDemoAppButton = () => {
    cy.clickElement(setupPageElements.CONTINUE_WITH_DEMO_APP_BUTTON);
};

const clickContinueWithOwnAppButton = () => {
    cy.clickElement(setupPageElements.CONTINUE_WITH_OWN_APP_BUTTON);
};

const verifyFullNameFailedMessage = () => {
    cy.verifyElement({
        labelElement: setupPageElements.FULL_NAME_ERROR,
        labelText: "Please enter a valid full name.",
    });
};

const verifyEmailFailedMessage = () => {
    cy.verifyElement({
        labelElement: setupPageElements.EMAIL_ADDRESS_ERROR,
        labelText: "Please enter a valid email address.",
    });
};

const verifyPasswordHintMinMessage = () => {
    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_MIN_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_MIN,
        labelText: "At least 8 characters long",
    });
};

const verifyPasswordHintCharMessage = () => {
    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_CHAR_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_CHAR,
        labelText: "At least one uppercase letter",
    });
};

const verifyPasswordHintNumberMessage = () => {
    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_NUMBER_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_NUMBER,
        labelText: "At least one number",
    });
};

const verifyPasswordHintSymbolMessage = () => {
    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_SYMBOL_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_SYMBOL,
        labelText: "At least one special character",
    });
};

const verifyConfirmPasswordHintSymbolMessage = () => {
    cy.verifyElement({
        element: setupPageElements.CONFIRM_PASSWORD_ERROR_DOT,
        labelElement: setupPageElements.CONFIRM_PASSWORD_ERROR,
        labelText: "Confirmation password has to be the same as password.",
    });
};

const verifyDefaultPageElements = () => {
    cy.verifyElement({
        element: setupPageElements.LOGO,
    });

    cy.verifyElement({
        element: setupPageElements.SELECT_LANGUAGE,
    });

    cy.verifyElement({
        labelElement: setupPageElements.FULL_NAME_LABEL,
        labelText: "Full Name",
        element: setupPageElements.FULL_NAME_INPUT,
        elementPlaceHolder: "Enter your full name"
    });

    cy.verifyElement({
        labelElement: setupPageElements.EMAIL_ADDRESS_LABEL,
        labelText: "Email Address",
        element: setupPageElements.EMAIL_ADDRESS_INPUT,
        elementPlaceHolder: "Enter your email adress"
    });

    cy.verifyElement({
        labelElement: setupPageElements.PASSWORD_LABEL,
        labelText: "Password",
        element: setupPageElements.PASSWORD_INPUT,
        elementPlaceHolder: "Enter your new password"
    });

    cy.verifyElement({
        labelElement: setupPageElements.CONFIRM_PASSWORD_LABEL,
        labelText: "Confirm Password",
        element: setupPageElements.CONFIRM_PASSWORD_INPUT,
        elementPlaceHolder: "Confirm your new password"
    });

    cy.verifyElement({
        element: setupPageElements.CONTINUE_WITH_DEMO_APP_BUTTON,
        value: "Continue with a demo app"
    });

    cy.verifyElement({
        element: setupPageElements.CONTINUE_WITH_OWN_APP_BUTTON,
        elementText: "I want to create my own app"
    });

    cy.clickElement(setupPageElements.CONTINUE_WITH_DEMO_APP_BUTTON);

    cy.verifyElement({
        labelElement: setupPageElements.FULL_NAME_ERROR,
        labelText: "Please enter a valid full name.",
    });

    cy.verifyElement({
        labelElement: setupPageElements.EMAIL_ADDRESS_ERROR,
        labelText: "Please enter a valid email adress.",
    });

    cy.verifyElement({
        labelElement: setupPageElements.EMAIL_ADDRESS_ERROR,
        labelText: "Please enter a valid email adress.",
    });

    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_MIN_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_MIN,
        labelText: "At least 8 characters long",
    });

    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_CHAR_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_CHAR,
        labelText: "At least one uppercase letter",
    });

    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_NUMBER_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_NUMBER,
        labelText: "At least one number",
    });

    cy.verifyElement({
        element: setupPageElements.PASSWORD_HINT_SYMBOL_DOT,
        labelElement: setupPageElements.PASSWORD_HINT_SYMBOL,
        labelText: "At least one special character",
    });

    typeConfirmPassword('a');
    cy.clickElement(setupPageElements.CONTINUE_WITH_DEMO_APP_BUTTON);

    cy.verifyElement({
        element: setupPageElements.CONFIRM_PASSWORD_ERROR_DOT,
        labelElement: setupPageElements.CONFIRM_PASSWORD_ERROR,
        labelText: "Confirmation password has to be the same as password.",
    });
};

const completeOnboardingSetup = ({
    fullName,
    emailAddress,
    password,
    confirmPassword,
    isDemoApp
}) => {
    typeFullName(fullName);
    typeEmailAddress(emailAddress);
    typePassword(password);
    typeConfirmPassword(confirmPassword);
    isDemoApp ? clickContinueWithDemoAppButton() : clickContinueWithOwnAppButton();
};

module.exports = {
    typeFullName,
    typeEmailAddress,
    typePassword,
    typeConfirmPassword,
    clickContinueWithDemoAppButton,
    clickContinueWithOwnAppButton,
    verifyFullNameFailedMessage,
    verifyEmailFailedMessage,
    verifyPasswordHintMinMessage,
    verifyPasswordHintCharMessage,
    verifyPasswordHintNumberMessage,
    verifyPasswordHintSymbolMessage,
    verifyConfirmPasswordHintSymbolMessage,
    verifyDefaultPageElements,
    completeOnboardingSetup
};