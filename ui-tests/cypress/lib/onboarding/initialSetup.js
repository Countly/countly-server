import initialSetupPageElements from '../../support/elements/onboarding/initialSetup';
const { APP_TYPE, DATA_TYPE } = require('../../support/constants');

const typeAppName = (appName) => {
    cy.typeInput(initialSetupPageElements.APPLICATION_NAME_INPUT, appName);
};

const typeAppKey = (appKey) => {
    cy.typeInput(initialSetupPageElements.APPLICATION_KEY_INPUT, appKey);
};

const selectAppType = (appType) => {
    if (appType === APP_TYPE.MOBILE) {
        cy.clickElement(initialSetupPageElements.APP_TYPE_MOBILE_RADIO_BUTTON);
    }
    else if (appType === APP_TYPE.WEB) {
        cy.clickElement(initialSetupPageElements.APP_TYPE_WEB_RADIO_BUTTON);
    }
    else if (appType === APP_TYPE.DESKTOP) {
        cy.clickElement(initialSetupPageElements.APP_TYPE_DESKTOP_RADIO_BUTTON);
    }
};

const selectTimezone = (timezone) => {
    cy.clickElement(initialSetupPageElements.SELECT_TIMEZONE_COMBOBOX);
    cy.typeInput(initialSetupPageElements.SELECT_TIMEZONE_SEARCH_INPUT, timezone);
    cy.clickElement('.cly-vue-listbox__item');
};

const selectDataType = (dataType) => {
    if (dataType === DATA_TYPE.ENTERTAINMENT) {
        cy.clickElement(initialSetupPageElements.DATA_TYPE_ENTERTAINMENT_RADIO_BUTTON);
    }
    else if (dataType === DATA_TYPE.FINANCE) {
        cy.clickElement(initialSetupPageElements.DATA_TYPE_FINANCE_RADIO_BUTTON);
    }
    else if (dataType === DATA_TYPE.B2BSAAS) {
        cy.clickElement(initialSetupPageElements.DATA_TYPE_B2B_SAAS_RADIO_BUTTON);
    }
    else if (dataType === DATA_TYPE.HEALTHCARE) {
        cy.clickElement(initialSetupPageElements.DATA_TYPE_HEALTHCARE_RADIO_BUTTON);
    }
    else if (dataType === DATA_TYPE.ECOMMERCE) {
        cy.clickElement(initialSetupPageElements.DATA_TYPE_ECOMMERCE_RADIO_BUTTON);
    }
    else if (dataType === DATA_TYPE.SOCIAL) {
        cy.clickElement(initialSetupPageElements.DATA_TYPE_SOCIAL_RADIO_BUTTON);
    }
};

const clickContinueSubmitButton = () => {
    cy.clickElement(initialSetupPageElements.CONTINUE_SUBMIT_BUTTON);
};

const verifyDefaultPageElements = (isDemoApp) => {
    cy.verifyElement({
        element: initialSetupPageElements.LOGO
    });

    if (isDemoApp) {
        cy.verifyElement({
            labelElement: initialSetupPageElements.PAGE_TITLE,
            labelText: "Let's create a demo app for you!"
        });

        cy.verifyElement({
            element: initialSetupPageElements.DATA_TYPE_ENTERTAINMENT_RADIO_BUTTON_ICON,
            labelElement: initialSetupPageElements.DATA_TYPE_ENTERTAINMENT_RADIO_BUTTON_LABEL,
            labelText: DATA_TYPE.ENTERTAINMENT
        });

        cy.verifyElement({
            element: initialSetupPageElements.DATA_TYPE_FINANCE_RADIO_BUTTON_ICON,
            labelElement: initialSetupPageElements.DATA_TYPE_FINANCE_RADIO_BUTTON_LABEL,
            labelText: DATA_TYPE.FINANCE
        });

        cy.verifyElement({
            element: initialSetupPageElements.DATA_TYPE_B2B_SAAS_RADIO_BUTTON_ICON,
            labelElement: initialSetupPageElements.DATA_TYPE_B2B_SAAS_RADIO_BUTTON_LABEL,
            labelText: DATA_TYPE.B2BSAAS
        });

        cy.verifyElement({
            element: initialSetupPageElements.DATA_TYPE_HEALTHCARE_RADIO_BUTTON_ICON,
            labelElement: initialSetupPageElements.DATA_TYPE_HEALTHCARE_RADIO_BUTTON_LABEL,
            labelText: DATA_TYPE.HEALTHCARE
        });

        cy.verifyElement({
            element: initialSetupPageElements.DATA_TYPE_ECOMMERCE_RADIO_BUTTON_ICON,
            labelElement: initialSetupPageElements.DATA_TYPE_ECOMMERCE_RADIO_BUTTON_LABEL,
            labelText: DATA_TYPE.ECOMMERCE
        });

        cy.verifyElement({
            element: initialSetupPageElements.DATA_TYPE_SOCIAL_RADIO_BUTTON_ICON,
            labelElement: initialSetupPageElements.DATA_TYPE_SOCIAL_RADIO_BUTTON_LABEL,
            labelText: DATA_TYPE.SOCIAL
        });

        cy.verifyElement({
            element: initialSetupPageElements.CONTINUE_SUBMIT_BUTTON,
            elementText: "Continue with data population",
            isDisabled: false
        });
    }
    else {
        cy.verifyElement({
            labelElement: initialSetupPageElements.PAGE_TITLE,
            labelText: "Let's add your first application"
        });

        cy.verifyElement({
            labelElement: initialSetupPageElements.PAGE_SUB_TITLE,
            labelText: "After adding your first application, you'll be ready to start collecting data"
        });

        cy.verifyElement({
            labelElement: initialSetupPageElements.APPLICATION_NAME_LABEL,
            labelText: "Application Name",
            element: initialSetupPageElements.APPLICATION_NAME_INPUT,
            elementPlaceHolder: "Application Name"
        });

        cy.verifyElement({
            labelElement: initialSetupPageElements.APPLICATION_KEY_LABEL,
            labelText: "App Key",
            element: initialSetupPageElements.APPLICATION_KEY_INPUT,
            elementPlaceHolder: "App Key",
            tooltipElement: initialSetupPageElements.APPLICATION_KEY_TOOLTIP,
            tooltipText: "You'll need this key for SDK integration"
        });

        cy.verifyElement({
            element: initialSetupPageElements.CONTINUE_SUBMIT_BUTTON,
            elementText: "Create Application",
            isDisabled: true
        });

        cy.clearInput(initialSetupPageElements.APPLICATION_NAME_INPUT);
        cy.clearInput(initialSetupPageElements.APPLICATION_KEY_INPUT);

        cy.verifyElement({
            labelElement: initialSetupPageElements.APPLICATION_NAME_ERROR,
            labelText: "The Application Name field is required"
        });

        cy.verifyElement({
            labelElement: initialSetupPageElements.APPLICATION_KEY_ERROR,
            labelText: "The App Key field is required"
        });
    }

    cy.verifyElement({
        labelElement: initialSetupPageElements.SELECT_APP_TYPE_LABEL,
        labelText: "Select your application type"
    });

    cy.verifyElement({
        element: initialSetupPageElements.APP_TYPE_MOBILE_RADIO_BUTTON_ICON,
        labelElement: initialSetupPageElements.APP_TYPE_MOBILE_RADIO_BUTTON_LABEL,
        labelText: APP_TYPE.MOBILE.toLowerCase()
    });

    cy.verifyElement({
        element: initialSetupPageElements.APP_TYPE_WEB_RADIO_BUTTON_ICON,
        labelElement: initialSetupPageElements.APP_TYPE_WEB_RADIO_BUTTON_LABEL,
        labelText: APP_TYPE.WEB.toLowerCase()
    });

    cy.verifyElement({
        element: initialSetupPageElements.APP_TYPE_DESKTOP_RADIO_BUTTON_ICON,
        labelElement: initialSetupPageElements.APP_TYPE_DESKTOP_RADIO_BUTTON_LABEL,
        labelText: APP_TYPE.DESKTOP.toLowerCase()
    });

    cy.verifyElement({
        labelElement: initialSetupPageElements.SELECT_TIMEZONE_LABEL,
        labelText: "Select your time zone",
        tooltipElement: initialSetupPageElements.SELECT_TIMEZONE_TOOLTIP,
        tooltipText: "All data will be recorded in this timezone"
    });
};

const checkPopulatorProgressBar = () => {
    cy
        .elementExists(initialSetupPageElements.DATA_POP_PROGRESS_BAR)
        .then((isExists) => {
            if (isExists) {
                cy.verifyElement({
                    element: initialSetupPageElements.DATA_POP_PROGRESS_BAR_IMG,
                    labelElement: initialSetupPageElements.DATA_POP_PROGRESS_BAR_TEXT,
                    labelText: 'Populating data for your app'
                });
                cy.wait(30000);
                cy.shouldNotExist(initialSetupPageElements.DATA_POP_PROGRESS_BAR);
            }
        });
};

const verifyPopulatorProgressImg = () => {
    cy.verifyElement({
        element: initialSetupPageElements.DATA_POP_PROGRESS_BAR_IMG,
    });
};

const verifyPopulatorContinueButton = () => {
    cy.verifyElement({
        element: initialSetupPageElements.CONTINUE_BUTTON,
        elementText: 'Continue'
    });
};

const clickPopulatorContinueButton = () => {
    cy.clickElement(initialSetupPageElements.CONTINUE_BUTTON);
};

const completeOnboardingInitialSetup = ({
    isDemoApp,
    appName,
    appKey,
    appType,
    demoAppData,
    timezone
}) => {
    if (!isDemoApp) {
        typeAppName(appName);
        if (appKey != null) {
            typeAppKey(appKey);
        }
    }
    else {
        selectDataType(demoAppData);
    }

    selectAppType(appType);
    selectTimezone(timezone);

    clickContinueSubmitButton();

    if (isDemoApp) {
        checkPopulatorProgressBar();
        verifyPopulatorContinueButton();
        clickPopulatorContinueButton();
    }
};

module.exports = {
    typeAppName,
    typeAppKey,
    selectAppType,
    verifyDefaultPageElements,
    selectTimezone,
    selectDataType,
    clickContinueSubmitButton,
    completeOnboardingInitialSetup,
    checkPopulatorProgressBar,
    verifyPopulatorProgressImg,
    verifyPopulatorContinueButton,
    clickPopulatorContinueButton
};