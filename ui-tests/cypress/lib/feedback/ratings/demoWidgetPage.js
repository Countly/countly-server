const getApiKey = require('../../../api/getApiKey');
const getApps = require('../../../api/getApps');
const helper = require('../../../support/helper');
const { faker } = require('@faker-js/faker');

const demoPageElements = {
    CLOSE_BUTTON: '#close-btn',
    QUESTION_LABEL: '#question-area',
    EMOJI_ONE_ICON: '#cf-rating-item-0',
    EMOJI_TWO_ICON: '#cf-rating-item-1',
    EMOJI_THREE_ICON: '#cf-rating-item-2',
    EMOJI_FOUR_ICON: '#cf-rating-item-3',
    EMOJI_FIVE_ICON: '#cf-rating-item-4',
    ADD_COMMENT_CHECKBOX: '#countly-feedback-show-comment',
    ADD_COMMENT_LABEL: '#cf-comment-text',
    ADD_COMMENT_INPUT: '#countly-feedback-comment-textarea',
    CONTACT_VIA_CHECKBOX: '#countly-feedback-show-email',
    CONTACT_VIA_LABEL: '#cf-email-text',
    CONTACT_VIA_INPUT: '#countly-feedback-contact-me-email',
    SUBMIT_BUTTON: '#cf-submit-button',
    LOGO_IMAGE: '#powered-by-countly',
    SUCCESS_ICON: '#thanks-area-logo',
    THANK_YOU_MESSAGE: '#thanks-area',
};

const goToDemoWidgetPage = (username, password, appName, widgetID) => {
    getApiKey.request(username, password)
        .then((response) => {
            const apiKey = response;
            return getApps.request(apiKey);
        })
        .then((response) => {
            for (const key in response.admin_of) {
                if (response.admin_of[key].name === appName) {

                    const appKey = response.admin_of[key].key;
                    cy.visit(`/feedback/rating?widget_id=${widgetID}&device_id=test&app_key=${appKey}`);
                }
            }
        });
};

const verifyDemoPageElements = ({
    question,
    emojiOneText,
    emojiTwoText,
    emojiThreeText,
    emojiFourText,
    emojiFiveText,
    selectedEmojiItemIndex = 0,
    isCheckedAddComment,
    commentCheckboxLabelText,
    isCheckedViaContact,
    viaContactCheckboxLabelText,
    submitButtonText,
    submitButtonColor,
    submitButtonFontColor,
    hasPoweredByLogo,
    thankYouMessageText,
    successIconColor
}) => {

    cy.verifyElement({
        element: demoPageElements.CLOSE_BUTTON,
    });

    cy.verifyElement({
        element: demoPageElements.QUESTION_LABEL,
        elementText: question
    });

    cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_ONE_ICON, emojiOneText);
    cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_TWO_ICON, emojiTwoText);
    cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_THREE_ICON, emojiThreeText);
    cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_FOUR_ICON, emojiFourText);
    cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_FIVE_ICON, emojiFiveText);

    if (selectedEmojiItemIndex === 1) {
        cy.clickElement(demoPageElements.EMOJI_ONE_ICON);
    }
    else if (selectedEmojiItemIndex === 2) {
        cy.clickElement(demoPageElements.EMOJI_TWO_ICON);
    }
    else if (selectedEmojiItemIndex === 3) {
        cy.clickElement(demoPageElements.EMOJI_THREE_ICON);
    }
    else if (selectedEmojiItemIndex === 4) {
        cy.clickElement(demoPageElements.EMOJI_FOUR_ICON);
    }
    else if (selectedEmojiItemIndex === 5) {
        cy.clickElement(demoPageElements.EMOJI_FIVE_ICON);
    }

    if (isCheckedAddComment) {
        cy.verifyElement({
            labelElement: demoPageElements.ADD_COMMENT_LABEL,
            labelText: commentCheckboxLabelText,
        });

        cy.clickElement(demoPageElements.ADD_COMMENT_CHECKBOX);
        cy.typeInput(demoPageElements.ADD_COMMENT_INPUT, faker.lorem.words({ min: 1, max: 10 }));
    }

    if (isCheckedViaContact) {
        cy.verifyElement({
            labelElement: demoPageElements.CONTACT_VIA_LABEL,
            labelText: viaContactCheckboxLabelText,
        });

        cy.clickElement(demoPageElements.CONTACT_VIA_CHECKBOX);
        cy.typeInput(demoPageElements.CONTACT_VIA_INPUT, faker.internet.email());
    }

    cy.verifyElement({
        element: demoPageElements.SUBMIT_BUTTON,
        elementText: submitButtonText,
        selectedMainColor: submitButtonColor,
        selectedFontColor: submitButtonFontColor
    });

    if (hasPoweredByLogo) {
        cy.verifyElement({
            element: demoPageElements.LOGO_IMAGE,
        });
    }
    else {
        cy.shouldNotExist(demoPageElements.LOGO_IMAGE);
    }

    cy.clickElement(demoPageElements.SUBMIT_BUTTON);

    cy.verifyElement({
        labelElement: demoPageElements.THANK_YOU_MESSAGE,
        labelText: thankYouMessageText,
    });

    cy.getElement(demoPageElements.SUCCESS_ICON).invoke("attr", "style").should("contain", helper.hexToRgb(successIconColor));

    if (hasPoweredByLogo) {
        cy.verifyElement({
            element: demoPageElements.LOGO_IMAGE,
        });
    }
    else {
        cy.shouldNotExist(demoPageElements.LOGO_IMAGE);
    }
};

module.exports = {
    goToDemoWidgetPage,
    verifyDemoPageElements
};
