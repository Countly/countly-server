const base64 = require('base-64');
const helper = require('../../../../support/helper');

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
    CONSENT: '#consent',
    SUBMIT_BUTTON: '#cf-submit-button',
    LOGO_IMAGE: '#powered-by-countly',
    SUCCESS_ICON: '#thanks-area-logo',
    THANK_YOU_MESSAGE: '#thanks-area',
};

const goToDemoWidgetPage = (username, password, appName, widgetID) => {
    // Cypress commands all the way: getApiKey and getApps answer through a
    // Cypress.Promise, so a cy.visit inside their .then ran outside the command
    // queue, and the checks that follow could start on the widgets page before
    // the popup opened.
    cy.request({
        method: 'GET',
        url: '/api-key',
        headers: {
            accept: 'text/plain',
            authorization: `Basic ${base64.encode(username + ":" + password)}`,
        },
    }).then((keyResponse) => {
        const apiKey = keyResponse.body;
        return cy.request({
            method: 'GET',
            url: `/o/apps/mine?api_key=${apiKey}`,
            headers: {
                accept: 'text/plain',
            },
        });
    }).then((appsResponse) => {
        const apps = appsResponse.body.admin_of || {};
        const appKey = Object.keys(apps).map((id) => apps[id]).filter((app) => app.name === appName).map((app) => app.key)[0];
        expect(appKey, 'app key of ' + appName).to.be.a('string');
        cy.visit(`/feedback/rating?widget_id=${widgetID.trim()}&device_id=test&app_key=${appKey}&custom={"tc":1,"rw":1,"xb":1}`);
    });
};

const verifyDemoPageElementsAndRate = ({
    question,
    emojiOneText,
    emojiTwoText,
    emojiThreeText,
    emojiFourText,
    emojiFiveText,
    selectedEmojiItemIndex = 0,
    commentCheckboxLabelText,
    comment,
    contactViaCheckboxLabelText,
    contactEmail,
    submitButtonText,
    submitButtonColor,
    submitButtonFontColor,
    consentText = null,
    hasPoweredByLogo = true,
    thankYouMessageText,
    successIconColor
}) => {

    cy.verifyElement({
        element: demoPageElements.CLOSE_BUTTON,
    });

    if (question != null) {
        cy.verifyElement({
            element: demoPageElements.QUESTION_LABEL,
            elementText: question
        });
    }

    if (emojiOneText != null) {
        cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_ONE_ICON, emojiOneText);
        cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_TWO_ICON, emojiTwoText);
        cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_THREE_ICON, emojiThreeText);
        cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_FOUR_ICON, emojiFourText);
        cy.shouldDataOriginalTitleContainText(demoPageElements.EMOJI_FIVE_ICON, emojiFiveText);
    }

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

    if (comment != null) {
        cy.verifyElement({
            labelElement: demoPageElements.ADD_COMMENT_LABEL,
            labelText: commentCheckboxLabelText,
        });

        cy.clickElement(demoPageElements.ADD_COMMENT_CHECKBOX);
        cy.typeInput(demoPageElements.ADD_COMMENT_INPUT, comment);
    }

    if (contactEmail != null) {
        cy.verifyElement({
            labelElement: demoPageElements.CONTACT_VIA_LABEL,
            labelText: contactViaCheckboxLabelText,
        });

        cy.clickElement(demoPageElements.CONTACT_VIA_CHECKBOX);
        cy.typeInput(demoPageElements.CONTACT_VIA_INPUT, contactEmail);
    }

    if (submitButtonText != null) {
        cy.verifyElement({
            element: demoPageElements.SUBMIT_BUTTON,
            elementText: submitButtonText,
            selectedMainColor: submitButtonColor,
            selectedFontColor: submitButtonFontColor
        });
    }

    if (hasPoweredByLogo) {
        cy.verifyElement({
            element: demoPageElements.LOGO_IMAGE,
        });
    }
    else {
        cy.shouldNotExist(demoPageElements.LOGO_IMAGE);
    }

    if (consentText != null) {
        cy.getElement(demoPageElements.CONSENT)
            .find('input[type="checkbox"]')
            .click();
    }

    cy.clickElement(demoPageElements.SUBMIT_BUTTON);

    // cy.window().then((win) => {
    //   win.sessionStorage.setItem('createdDate', helper.getCurrentDate());
    // });

    if (thankYouMessageText != null) {
        cy.verifyElement({
            labelElement: demoPageElements.THANK_YOU_MESSAGE,
            labelText: thankYouMessageText,
        });
    }

    if (successIconColor != null) {
        cy.getElement(demoPageElements.SUCCESS_ICON).invoke("attr", "style").should("contain", helper.hexToRgb(successIconColor));
    }

    // if (hasPoweredByLogo) { //TODO: Page returns to the previous page fastly, so it is not possible to check the logo image
    //     cy.verifyElement({
    //         element: demoPageElements.LOGO_IMAGE,
    //     });
    // }
    // else {
    //     cy.shouldNotExist(demoPageElements.LOGO_IMAGE);
    // }
};

module.exports = {
    goToDemoWidgetPage,
    verifyDemoPageElementsAndRate
};
