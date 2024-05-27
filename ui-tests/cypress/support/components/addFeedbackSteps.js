import { feedbackRatingWidgetsPageElements } from "../elements/feedback/ratings/widgets";
const { FEEDBACK_ADD_STEPS } = require('../constants');

const verifyRatingStepElements = (step) => {
    if (step === FEEDBACK_ADD_STEPS.SETTINGS) {
        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.STEP_SIGN_NUMBER_ONE,
            elementText: '1',
        });

        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.STEP_SIGN_NUMBER_TWO,
            elementText: '2',
        });

        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.STEP_SIGN_NUMBER_THREE,
            elementText: '3',
        });
        verifyRatingStepStaticElements();

    }
    else if (step === FEEDBACK_ADD_STEPS.APPEARANCE) {

        cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_SETTINGS_CHECK_ICON });
        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.STEP_SIGN_NUMBER_TWO,
            elementText: '2',
        });

        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.STEP_SIGN_NUMBER_THREE,
            elementText: '3',
        });
        verifyRatingStepStaticElements();

    }
    else if (step === FEEDBACK_ADD_STEPS.DEVICES_TARGETING) {

        cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_SETTINGS_CHECK_ICON });
        cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_APPEARANCE_CHECK_ICON });
        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.STEP_SIGN_NUMBER_THREE,
            elementText: '3',
        });
        verifyRatingStepStaticElements();
    }
};

const verifyRatingStepStaticElements = () => {

    cy.verifyElement({ element: feedbackRatingWidgetsPageElements.ADD_NEW_WIDGET_HEADER_TITLE_LABEL, elemenText: "Add new widget" });
    cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_SETTINGS_LABEL, elementText: FEEDBACK_ADD_STEPS.SETTINGS });
    cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_SEPERATOR_ONE });

    cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_APPEARANCE_LABEL, elemenText: FEEDBACK_ADD_STEPS.APPEARANCE });
    cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_SEPERATOR_TWO });
    cy.verifyElement({ element: feedbackRatingWidgetsPageElements.STEP_DEVICES_LABEL, elemenText: FEEDBACK_ADD_STEPS.DEVICES_TARGETING });
    cy.verifyElement({ element: feedbackRatingWidgetsPageElements.CLOSE_ICON });
};

const clickSettingsTab = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.STEP_SETTINGS_LABEL);
};

const clickAppearenceTab = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.STEP_APPEARANCE_LABEL);
};

const clickDevicesTargetingTab = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.STEP_DEVICES_LABEL);
};

module.exports = {
    verifyRatingStepElements,
    clickSettingsTab,
    clickAppearenceTab,
    clickDevicesTargetingTab
};