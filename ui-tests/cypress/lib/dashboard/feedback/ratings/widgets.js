import {
    feedbackRatingWidgetsPageElements,
    feedbackRatingWidgetAddUserConsentElements,
    widgetsDataTableElements,
    feedbackRatingWidgetDetailsPageElements,
    feedbackRatingWidgetDetailsCommentsDataTableElements,
    feedbackRatingWidgetDetailsRatingsDataTableElements
} from "../../../../support/elements/dashboard/feedback/ratings/widgets";

const stepElements = require("../../../../support/components/addFeedbackSteps");
const { FEEDBACK_ADD_STEPS } = require('../../../../support/constants');
const helper = require('../../../../support/helper');
const getApiKey = require('../../../../api/getApiKey');
const getApps = require('../../../../api/getApps');
const getToken = require('../../../../api/createToken');
const createRating = require('../../../../api/feedbackWidgetsCreate');

const verifyEmptyPageElements = () => {

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATING_WIDGETS_HEADER_TITLE_LABEL,
        labelText: "Rating Widgets",
        element: feedbackRatingWidgetsPageElements.ADD_NEW_WIDGET_BUTTON,
        elementText: 'Add New Widget'
    });

    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.RATINGS_WIDGETS_EMPTY_PAGE_ICON,
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_WIDGETS_EMPTY_PAGE_TITLE,
        labelText: "Create your first Ratings Widget",
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_WIDGETS_EMPTY_PAGE_SUBTITLE,
        labelText: 'Create a Ratings Widget to collect, store, search, and track user feedback from web and mobile applications.',
        element: feedbackRatingWidgetsPageElements.RATINGS_WIDGETS_EMPTY_PAGE_ADD_NEW_WIDGET_BUTTON,
        elementText: '+ Add New Widget'
    });
};

const verifyFullDataPageElements = () => {

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATING_WIDGETS_HEADER_TITLE_LABEL,
        labelText: "Rating Widgets",
        element: feedbackRatingWidgetsPageElements.ADD_NEW_WIDGET_BUTTON,
        elementText: 'Add New Widget'
    });

    verifyWidgetDataFromTable({
        index: 0,
        shouldNot: true,
        isActive: false,
    });
};

const verifySettingsPageElements = ({
    widgetName,
    question,
    emojiOneText,
    emojiTwoText,
    emojiThreeText,
    emojiFourText,
    emojiFiveText,
    isCheckedAddComment,
    commentText,
    isCheckedViaContact,
    viaContactText,
    isCheckedAddConsent,
    consentText,
    consentItems = [],
    submitButtonText,
    thanksMessageText
}) => {

    stepElements.verifyRatingStepElements(FEEDBACK_ADD_STEPS.SETTINGS);

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.WIDGET_NAME_LABEL,
        labelText: "Internal Name",
        element: feedbackRatingWidgetsPageElements.WIDGET_NAME_INPUT,
        value: widgetName,
        elementPlaceHolder: "Enter an Internal Name"
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.WIDGET_NAME_DESC,
        labelText: "This name is internal and will not be shown to your end user.",
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.QUESTION_LABEL,
        labelText: "Question",
        element: feedbackRatingWidgetsPageElements.QUESTION_INPUT,
        value: question,
        elementPlaceHolder: "Type your question here"
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.RATINGS_LABEL,
        elementText: "Ratings"
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.EMOJI_ONE_TEXT_INPUT,
        value: emojiOneText
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.EMOJI_TWO_TEXT_INPUT,
        value: emojiTwoText
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.EMOJI_THREE_TEXT_INPUT,
        value: emojiThreeText
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.EMOJI_FOUR_TEXT_INPUT,
        value: emojiFourText
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.EMOJI_FIVE_TEXT_INPUT,
        value: emojiFiveText
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.ADD_COMMENT_LABEL,
        labelText: "Use \"Add comment\" option",
        element: feedbackRatingWidgetsPageElements.ADD_COMMENT_CHECKBOX,
        isChecked: isCheckedAddComment
    });
    if (isCheckedAddComment) {
        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.ADD_COMMENT_INPUT,
            value: commentText,
        });
    }
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.CONTACT_VIA_LABEL,
        labelText: "Use \"Contact me via e-mail\" option",
        element: feedbackRatingWidgetsPageElements.CONTACT_VIA_CHECKBOX,
        isChecked: isCheckedViaContact
    });

    if (isCheckedViaContact) {
        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.CONTACT_VIA_INPUT,
            value: viaContactText,
        });
    }

    cy.verifyElement({
        labelElement: feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_LABEL,
        labelText: "Add user consent",
        element: feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_CHECKBOX,
        isChecked: isCheckedAddConsent
    });

    if (isCheckedAddConsent) {
        cy.verifyElement({
            labelElement: feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_TEXT_LABEL,
            labelText: "Text",
        });

        cy.verifyElement({
            element: feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_TEXT_INPUT,
            value: consentText,
        });

        cy.verifyElement({
            labelElement: feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_LINK_LABEL,
            labelText: "Link(s)",
            tooltipElement: feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_LINK_TOOLTIP,
            tooltipText: "Matching link texts inside the consent text are modified to be links",
        });

        cy.verifyElement({
            element: feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_CONSENT_ADD_LINK_BUTTON,
        });

        consentItems.forEach((consent, index) => {
            const consentLinkElements = feedbackRatingWidgetAddUserConsentElements(index);

            cy.verifyElement({
                element: consentLinkElements.ADD_USER_CONSENT_CONSENT_LINKS_TEXT_INPUT,
                value: consent.text,
            });

            cy.verifyElement({
                element: consentLinkElements.ADD_USER_CONSENT_CONSENT_LINKS_URL_INPUT,
                value: consent.link,
            });
        });
    }

    cy.scrollPageToBottom('.cly-vue-drawer__steps-container.is-multi-step');

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.BUTTON_CALLOUT_LABEL,
        labelText: "Button Callout",
        element: feedbackRatingWidgetsPageElements.BUTTON_CALLOUT_INPUT,
        value: submitButtonText
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.THANKS_MESSAGE_LABEL,
        labelText: "Thank you Message",
        element: feedbackRatingWidgetsPageElements.THANKS_MESSAGE_INPUT,
        value: thanksMessageText
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.CANCEL_BUTTON,
        elementText: "Cancel"
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.NEXT_STEP_BUTTON,
        elementText: "Next step"
    });
};

const verifyAppearancePageElements = ({
    ratingSymbol,
    isLogoDefault,
    isLogoCustom,
    isLogoDontUse,
    selectedMainIconColor,
    selectedFontIconColor,
    isButtonSizeSmall = false,
    isButtonSizeMedium = false,
    isButtonSizeLarge = false,
    isPositionCenterLeft = false,
    isPositionCenterRight = false,
    isPositionBottomLeft = false,
    isPositionBottomRight = false,
    triggerText,
    isHideSticker = false
}) => {

    stepElements.verifyRatingStepElements(FEEDBACK_ADD_STEPS.APPEARANCE);

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATING_SYMBOL_LABEL,
        labelText: "Rating Symbol",
        element: feedbackRatingWidgetsPageElements.RATING_SYMBOL_COMBOBOX,
        value: ratingSymbol
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.LOGO_LABEL,
        labelText: "Logo",
        tooltipElement: feedbackRatingWidgetsPageElements.LOGO_TOOLTIP,
        tooltipText: "Add your own company or app logo to customize your ratings widget. Please limit logo file with  PNG or  JPEG file types. Uploaded logo will be scaled to 140 x 50 pixels."
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.LOGO_DEFAULT_LABEL,
        labelText: "Use default logo",
        element: feedbackRatingWidgetsPageElements.LOGO_DEFAULT_RADIO_BUTTON,
        isChecked: isLogoDefault
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.LOGO_CUSTOM_LABEL,
        labelText: "Upload a custom logo",
        element: feedbackRatingWidgetsPageElements.LOGO_CUSTOM_RADIO_BUTTON,
        isChecked: isLogoCustom
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.LOGO_DONT_USE_LABEL,
        labelText: "Dont use a logo",
        element: feedbackRatingWidgetsPageElements.LOGO_DONT_USE_RADIO_BUTTON,
        isChecked: isLogoDontUse
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.MAIN_COLOR_LABEL,
        labelText: "Main Color",
        unVisibleElement: feedbackRatingWidgetsPageElements.MAIN_COLOR_ICON,
        selectedIconColor: selectedMainIconColor
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.FONT_COLOR_LABEL,
        labelText: "Font Color",
        unVisibleElement: feedbackRatingWidgetsPageElements.FONT_COLOR_ICON,
        selectedIconColor: selectedFontIconColor
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.TRIGGER_BUTTON_SIZE_LABEL,
        labelText: "Trigger Button Size",
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.BUTTON_SIZE_SMALL_LABEL,
        labelText: "Small",
        element: feedbackRatingWidgetsPageElements.BUTTON_SIZE_SMALL_RADIO_BUTTON,
        isChecked: isButtonSizeSmall
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.BUTTON_SIZE_MEDIUM_LABEL,
        labelText: "Medium",
        element: feedbackRatingWidgetsPageElements.BUTTON_SIZE_MEDIUM_RADIO_BUTTON,
        isChecked: isButtonSizeMedium
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.BUTTON_SIZE_LARGE_LABEL,
        labelText: "Large",
        element: feedbackRatingWidgetsPageElements.BUTTON_SIZE_LARGE_RADIO_BUTTON,
        isChecked: isButtonSizeLarge
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.POSITION_ON_THE_PAGE_LABEL,
        elementText: "Position on the page",
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.POSITION_CENTER_LEFT_LABEL,
        labelText: "Center left",
        element: feedbackRatingWidgetsPageElements.POSITION_CENTER_LEFT_RADIO_BUTTON,
        isChecked: isPositionCenterLeft
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.POSITION_CENTER_RIGHT_LABEL,
        labelText: "Center right",
        element: feedbackRatingWidgetsPageElements.POSITION_CENTER_RIGHT_RADIO_BUTTON,
        isChecked: isPositionCenterRight
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.POSITION_BOTTOM_LEFT_LABEL,
        labelText: "Bottom left",
        element: feedbackRatingWidgetsPageElements.POSITION_BOTTOM_LEFT_RADIO_BUTTON,
        isChecked: isPositionBottomLeft
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.POSITION_BOTTOM_RIGHT_LABEL,
        labelText: "Bottom right",
        element: feedbackRatingWidgetsPageElements.POSITION_BOTTOM_RIGHT_RADIO_BUTTON,
        isChecked: isPositionBottomRight
    });

    cy.scrollPageToBottom('.cly-vue-drawer__steps-container.is-multi-step');

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.TRIGGER_TEXT_LABEL,
        labelText: "Trigger text",
        element: feedbackRatingWidgetsPageElements.TRIGGER_TEXT_INPUT,
        value: triggerText
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.VISIBILITY_LABEL,
        labelText: "Visibility",
        tooltipElement: feedbackRatingWidgetsPageElements.VISIBILITY_TOOLTIP,
        tooltipText: "When checked, the Ratings sticker will be hidden from view and will only be visible upon a user-based action trigger from code."
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.HIDE_STICKER_LABEL,
        labelText: "Hide sticker",
        element: feedbackRatingWidgetsPageElements.HIDE_STICKER_CHECKBOX,
        isChecked: isHideSticker
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.PREVIOUS_STEP_BUTTON,
        elementText: "Previous step"
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.NEXT_STEP_BUTTON,
        elementText: "Next step"
    });
};

const verifyDevicesAndTargetingPageElements = ({
    isShowOnly = false,
    isActive = false,
}) => {

    stepElements.verifyRatingStepElements(FEEDBACK_ADD_STEPS.DEVICES_TARGETING);

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.SHOW_ONLY_LABEL,
        labelText: "Show ratings widget only on selected pages",
        element: feedbackRatingWidgetsPageElements.SHOW_ONLY_CHECKBOX,
        isChecked: isShowOnly
    });
    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.SET_ACTIVE_LABEL,
        labelText: "Set widget active",
        element: feedbackRatingWidgetsPageElements.SET_ACTIVE_CHECKBOX,
        isChecked: isActive
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.PREVIOUS_STEP_BUTTON,
        elementText: "Previous step"
    });
    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.SAVE_BUTTON,
        elementText: "Save"
    });
};

const verifySettingsPageDefaultElements = () => {
    verifySettingsPageElements({
        question: "What's your opinion about this page?",
        emojiOneText: "Very Dissatisfied",
        emojiTwoText: "Somewhat Dissatisfied",
        emojiThreeText: "Neither Satisfied Nor Dissatisfied",
        emojiFourText: "Somewhat Satisfied",
        emojiFiveText: "Very Satisfied",
        isCheckedAddComment: false,
        isCheckedViaContact: false,
        submitButtonText: "Submit Feedback",
        thanksMessageText: "Thanks for your feedback!"
    });
};

const verifyAppearancePageDefaultElements = () => {
    verifyAppearancePageElements({
        ratingSymbol: "Emojis",
        isLogoDefault: true,
        selectedMainIconColor: "#0166D6",
        selectedFontIconColor: "#0166D6",
        isButtonSizeMedium: true,
        isPositionCenterLeft: true,
        triggerText: "Feedback",
    });
};

const verifyDevicesAndTargetingPageDefaultElements = () => {
    verifyDevicesAndTargetingPageElements({
        isShowOnly: false,
        isActive: true
    });
};

const clickAddNewWidgetButton = () => {
    cy
        .elementExists(feedbackRatingWidgetsPageElements.RATINGS_WIDGETS_EMPTY_PAGE_ADD_NEW_WIDGET_BUTTON)
        .then((isExists) => {
            if (isExists) {
                verifyEmptyPageElements();
                cy.clickElement(feedbackRatingWidgetsPageElements.RATINGS_WIDGETS_EMPTY_PAGE_ADD_NEW_WIDGET_BUTTON);
            }
            else {
                cy.clickElement(feedbackRatingWidgetsPageElements.ADD_NEW_WIDGET_BUTTON);
            }
        });
};

const clickNextStepButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.NEXT_STEP_BUTTON);
};

const clickCancelButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.CANCEL_BUTTON);
};

const clickPreviousStepButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.PREVIOUS_STEP_BUTTON);
};

const clickSaveButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.SAVE_BUTTON);
    cy.checkPaceActive();
};

const typeQuestion = (question) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.QUESTION_INPUT, question);
};

const typeWidgetName = (widgetName) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.WIDGET_NAME_INPUT, widgetName);
};

const clearQuestion = () => {
    cy.clearInput(feedbackRatingWidgetsPageElements.QUESTION_INPUT);
};

const clearThanksMessage = () => {
    cy.clearInput(feedbackRatingWidgetsPageElements.THANKS_MESSAGE_INPUT);
};

const typeEmojiOneText = (text) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.EMOJI_ONE_TEXT_INPUT, text);
};

const typeEmojiTwoText = (text) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.EMOJI_TWO_TEXT_INPUT, text);
};

const typeEmojiThreeText = (text) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.EMOJI_THREE_TEXT_INPUT, text);
};

const typeEmojiFourText = (text) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.EMOJI_FOUR_TEXT_INPUT, text);
};

const typeEmojiFiveText = (text) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.EMOJI_FIVE_TEXT_INPUT, text);
};

const clickAddCommentCheckbox = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.ADD_COMMENT_CHECKBOX);
};

const typeAddCommentCheckboxLabelText = (comment) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.ADD_COMMENT_INPUT, comment);
};

const clickContactViaCheckbox = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.CONTACT_VIA_CHECKBOX);
};

const typeContactViaCheckboxLabelText = (email) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.CONTACT_VIA_INPUT, email);
};

const clickAddUserConsentCheckbox = () => {
    cy.clickElement(feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_CHECKBOX);
};

const typeAddUserConsentText = (text) => {
    cy.typeInput(feedbackRatingWidgetAddUserConsentElements().ADD_USER_CONSENT_TEXT_INPUT, text);
};

const typeAddUserConsentLinkText = (index, text) => {
    cy.typeInput(feedbackRatingWidgetAddUserConsentElements(index).ADD_USER_CONSENT_CONSENT_LINKS_TEXT_INPUT, text);
};

const typeAddUserConsentLinkUrl = (index, link) => {
    cy.typeInput(feedbackRatingWidgetAddUserConsentElements(index).ADD_USER_CONSENT_CONSENT_LINKS_URL_INPUT, link);
};

const typeButtonCallOut = (buttonText) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.BUTTON_CALLOUT_INPUT, buttonText);
};

const typeThanksMessage = (thanksMessageText) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.THANKS_MESSAGE_INPUT, thanksMessageText);
};

const selectRatingSymbol = (symbol) => {
    cy.selectOption(feedbackRatingWidgetsPageElements.RATING_SYMBOL_COMBOBOX, symbol);
};

const clickUseDefaultLogoRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.LOGO_DEFAULT_RADIO_BUTTON);
};

const clickUploadCustomLogoRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.LOGO_CUSTOM_RADIO_BUTTON);
};

const clickDontUseLogoRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.LOGO_DONT_USE_RADIO_BUTTON);
};

const uploadLogo = (logoPath) => {
    cy.uploadFile(feedbackRatingWidgetsPageElements.UPLOAD_FILE_DROPZONE, logoPath);
};

const selectMainColor = (colorCode) => {
    cy.selectColor(feedbackRatingWidgetsPageElements.MAIN_COLOR_COMBOBOX, colorCode);
};

const selectFontColor = (colorCode) => {
    cy.selectColor(feedbackRatingWidgetsPageElements.FONT_COLOR_COMBOBOX, colorCode);
};

const clickTriggerButtonSmallSizeRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.BUTTON_SIZE_SMALL_RADIO_BUTTON);
};

const clickTriggerButtonMediumSizeRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.BUTTON_SIZE_MEDIUM_RADIO_BUTTON);
};

const clickTriggerButtonLargeSizeRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.BUTTON_SIZE_LARGE_RADIO_BUTTON);
};

const clickCenterLeftPositionRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.POSITION_CENTER_LEFT_LOGO);
};

const clickCenterRightPositionRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.POSITION_CENTER_RIGHT_LOGO);
};

const clickBottomLeftPositionRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.POSITION_BOTTOM_LEFT_LOGO);
};

const clickBottomRightPositionRadioButton = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.POSITION_BOTTOM_RIGHT_LOGO);
};

const typeTriggerText = (triggerText) => {
    cy.typeInput(feedbackRatingWidgetsPageElements.TRIGGER_TEXT_INPUT, triggerText);
};

const clickHideStickerCheckbox = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.HIDE_STICKER_CHECKBOX);
};

const clickCloseIcon = (index = 0) => {
    cy.clickElement(feedbackRatingWidgetsPageElements.CLOSE_ICON, index);
};

const clickShowOnlyCheckbox = () => {
    cy.clickElement(feedbackRatingWidgetsPageElements.SHOW_ONLY_CHECKBOX);
};

const typeShowOnlyPages = (...targetPages) => {
    cy.clickElement(feedbackRatingWidgetsPageElements.SHOW_ONLY_SELECTOR, true);

    for (var i = 0; i < targetPages.length; i++) {
        var itemSelector = 'el-option-test-id-' + helper.toSlug(targetPages[i]) + '-el-options';
        cy.typeInput(feedbackRatingWidgetsPageElements.SHOW_ONLY_SELECTOR_INPUT, targetPages[i]);
        cy.clickElement(itemSelector);
    }
    cy.clickBody();
};

const clickSetActiveCheckbox = (page) => {
    cy.clickElement(feedbackRatingWidgetsPageElements.SET_ACTIVE_CHECKBOX);
};

const verifyWidgetDataFromTable = ({
    index,
    shouldNot = false,
    widgetName = null,
    internalName = null,
    ratingScore = null,
    responses = null,
    pages = null,
    isActive = true
}) => {

    cy.verifyElement({
        element: widgetsDataTableElements().EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: widgetsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: widgetsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_STATUS_LABEL,
        elementText: "Status",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_STATUS_SORTABLE_ICON,
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_RATINGS_WIDGET_NAME_LABEL,
        elementText: "Ratings Widget Name",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_INTERNAL_NAME_LABEL,
        elementText: "Internal Name",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_RATING_SCORE_LABEL,
        elementText: "Rating Score"
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_RATING_SCORE_SORTABLE_ICON,
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_RESPONSES_LABEL,
        elementText: "Responses"
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements().COLUMN_NAME_RESPONSES_SORTABLE_ICON,
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements(index).COLUMN_NAME_PAGES_LABEL,
        elementText: "Pages"
    });

    cy.verifyElement({
        isElementVisible: false,
        element: widgetsDataTableElements(index).COLUMN_NAME_PAGES_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: widgetsDataTableElements(index).STATUS_SWITCH_WRAPPER,
        isChecked: isActive
    });

    cy.verifyElement({
        shouldNot: shouldNot,
        element: widgetsDataTableElements(index).WIDGET_NAME,
        elementText: widgetName
    });

    cy.verifyElement({
        element: widgetsDataTableElements(index).WIDGET_ID_LABEL,
        elementText: "Widget ID"
    });

    cy.verifyElement({
        element: widgetsDataTableElements(index).WIDGET_ID,
    });

    if (internalName != null) {
        cy.verifyElement({
            shouldNot: shouldNot,
            element: widgetsDataTableElements(index).INTERNAL_NAME,
            elementText: internalName
        });
    }

    cy.verifyElement({
        shouldNot: shouldNot,
        element: widgetsDataTableElements(index).RATING_SCORE,
        elementText: ratingScore
    });

    cy.verifyElement({
        shouldNot: shouldNot,
        element: widgetsDataTableElements(index).RESPONSES,
        elementText: responses
    });

    cy.verifyElement({
        shouldNot: shouldNot,
        element: widgetsDataTableElements(index).PAGES,
        elementText: pages
    });
};

const verifyPreviewRatingsPopUpElements = ({
    question,
    emojiOneText,
    emojiTwoText,
    emojiThreeText,
    emojiFourText,
    emojiFiveText,
    isCheckedAddComment,
    commentCheckboxLabelText,
    isCheckedViaContact,
    viaContactCheckboxLabelText,
    isCheckedAddConsent = false,
    consentText,
    submitButtonText,
    submitButtonColor,
    submitButtonFontColor,
    hasPoweredByLogo
}) => {

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_LABEL,
        labelText: 'Ratings Popup',
        element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_QUESTION_LABEL,
        elementText: question
    });

    cy.verifyElement({
        tooltipElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_EMOJI_ONE_ICON,
        tooltipText: emojiOneText
    });

    cy.verifyElement({
        tooltipElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_EMOJI_TWO_ICON,
        tooltipText: emojiTwoText
    });

    cy.verifyElement({
        tooltipElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_EMOJI_THREE_ICON,
        tooltipText: emojiThreeText
    });

    cy.verifyElement({
        tooltipElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_EMOJI_FOUR_ICON,
        tooltipText: emojiFourText
    });

    cy.verifyElement({
        tooltipElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_EMOJI_FIVE_ICON,
        tooltipText: emojiFiveText
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_ADD_COMMENT_LABEL,
        labelText: commentCheckboxLabelText,
        element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_ADD_COMMENT_CHECKBOX,
        isChecked: isCheckedAddComment
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_CONTACT_VIA_LABEL,
        labelText: viaContactCheckboxLabelText,
        element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_CONTACT_VIA_CHECKBOX,
        isChecked: isCheckedViaContact
    });

    if (isCheckedAddConsent) {
        cy.verifyElement({
            labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_CONSENT_LABEL,
            labelText: consentText,
            element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_CONSENT_CHECKBOX,
            attr: "checked",
            attrText: "checked",
        });
    }

    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_SUBMIT_BUTTON,
        elementText: submitButtonText,
        selectedMainColor: submitButtonColor,
        selectedFontColor: submitButtonFontColor
    });

    if (hasPoweredByLogo) {
        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_POWEREDBY_LOGO,
        });
    }
    else {
        cy.shouldNotExist(feedbackRatingWidgetsPageElements.RATINGS_POPUP_POWEREDBY_LOGO);
    }
};

const verifyPreviewThankYouMessagePopUpElements = ({
    thankYouMessageText,
    successIconColor,
    hasPoweredByLogo
}) => {

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_THANK_YOU_MESSAGE_POPUP_LABEL,
        labelText: 'Thank you Message',
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_SUCCESS_ICON,
        element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_SUCCESS_ICON_COLOR,
        selectedMainColor: successIconColor
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_THANK_YOU_MESSAGE_TEXT,
        labelText: thankYouMessageText,
    });

    if (hasPoweredByLogo) {
        cy.verifyElement({
            element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_THANK_YOU_MESSAGE_POWEREDBY_LOGO,
        });
    }
    else {
        cy.shouldNotExist(feedbackRatingWidgetsPageElements.RATINGS_POPUP_THANK_YOU_MESSAGE_POWEREDBY_LOGO);
    }
};

const verifyPreviewTriggerButtonPopUpElements = ({
    triggerButtonText,
    triggerButtonColor,
    triggerButtonFontColor
}) => {

    cy.scrollPageToBottom('.cly-vue-drawer__sidecars-view', 1);

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_TRIGGER_POPUP_LABEL,
        labelText: 'Trigger Button Preview',
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetsPageElements.RATINGS_POPUP_TRIGGER_BUTTON_LABEL,
        labelText: triggerButtonText,
        element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_TRIGGER_BUTTON,
        selectedMainColor: triggerButtonColor,
        selectedFontColor: triggerButtonFontColor,
    });

    cy.verifyElement({
        element: feedbackRatingWidgetsPageElements.RATINGS_POPUP_TRIGGER_BUTTON,
        selectedFontColor: triggerButtonFontColor,
    });
};

const shouldBeDisabledNextStepButton = () => {
    cy.shouldBeHasDisabledClass(feedbackRatingWidgetsPageElements.NEXT_STEP_BUTTON);
};

const shouldNotBeDisabledNextStepButton = () => {
    cy.shouldNotBeHasDisabledClass(feedbackRatingWidgetsPageElements.NEXT_STEP_BUTTON);
};

const searchWidgetOnDataTable = (widgetName) => {
    cy.typeInput(widgetsDataTableElements().TABLE_SEARCH_INPUT, widgetName);
};

const getWidgetIdFromDataTable = (index) => {
    return cy.getElement(widgetsDataTableElements(index).WIDGET_ID).eq(0).getText();
};

const navigateToWidgetsDetailPage = (widgetName) => {
    searchWidgetOnDataTable(widgetName);
    cy.clickElement(widgetsDataTableElements().WIDGET_NAME, true);
};

const verifyWidgetDetailsPageElements = ({
    question,
    isActive = true,
    widgetId,
    ratingsValue = "0",
    ratingsRate = "0%",
    timesShownValue = "0",
    commentsTable,
    ratingsTable
}) => {
    const {
        ratings,
        times,
        comments,
        emails
    } = commentsTable;

    const {
        numberOfRatings,
        percentages
    } = ratingsTable;

    let index = 0;

    cy.verifyElement({
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_BACK_TO_RATING_WIDGETS_LINK_ICON,
    });

    cy.verifyElement({
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_BACK_TO_RATING_WIDGETS_LINK,
        elementText: "Back to Rating Widgets"
    });

    if (isActive) {
        cy.verifyElement({
            element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_STOP_WIDGET_BUTTON,
            elementText: "Stop Widget"
        });

        cy.verifyElement({
            element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_STATUS_LABEL,
            elementText: "Running"
        });
    }
    else {
        cy.verifyElement({
            element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_START_WIDGET_BUTTON,
            elementText: "Start Widget"
        });

        cy.verifyElement({
            element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_STATUS_LABEL,
            elementText: "Stopped"
        });
    }

    cy.verifyElement({
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_EDIT_WIDGET_BUTTON,
        elementText: "Edit Widget"
    });

    cy.verifyElement({
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_MORE_BUTTON,
    });

    if (question != null) {
        cy.verifyElement({
            labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_QUESTION,
            labelText: question,
        });
    }

    cy.verifyElement({
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_CREATED_AT_ICON,
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_CREATED_AT_LABEL,
        labelText: "Created at"
    });

    cy.verifyElement({
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_PRICE_TAG_ICON,
    });

    if (widgetId != null) {
        cy.verifyElement({
            labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_WIDGET_ID_LABEL,
            labelText: "Widget ID",
            element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_WIDGET_ID_VALUE,
            elementText: widgetId,
        });
    }

    cy.verifyElement({
        labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_RATINGS_LABEL,
        labelText: "Ratings",
        tooltipElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_RATINGS_TOOLTIP,
        tooltipText: "Number of Ratings surveys received.",
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_RATINGS_VALUE,
        elementText: ratingsValue
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_RATINGS_RATE_LABEL,
        labelText: "Ratings Rate",
        tooltipElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_RATINGS_RATE_TOOLTIP,
        tooltipText: "Rate of ratings calculated by Ratings Count / Times Shown",
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_RATINGS_RATE_VALUE,
        elementText: ratingsRate
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_TIMES_SHOWN_LABEL,
        labelText: "Times Shown",
        tooltipElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_TIMES_SHOWN_TOOLTIP,
        tooltipText: "Number of times the Ratings widget was shown to targeted users.",
        element: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_TIMES_SHOWN_VALUE,
        elementText: timesShownValue
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_TAB_RATINGS,
        labelText: "Ratings",
    });

    cy.verifyElement({
        labelElement: feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_TAB_COMMENTS,
        labelText: "Comments",
    });

    if (commentsTable.ratings != null && commentsTable.ratings.length > 0) {
        cy.scrollPageToBottom('.main-view');
        for (index = 0; index < ratingsTable.numberOfRatings.length; index++) {
            cy.verifyElement({
                labelElement: feedbackRatingWidgetDetailsRatingsDataTableElements(index).ROW_RATING,
                labelText: index + 1,
            });
        }

        for (index = 0; index < ratingsTable.numberOfRatings.length; index++) {
            cy.verifyElement({
                labelElement: feedbackRatingWidgetDetailsRatingsDataTableElements(index).ROW_NUMBER_OF_RATINGS,
                labelText: ratingsTable.numberOfRatings[index],
            });
        }

        for (index = 0; index < ratingsTable.percentages.length; index++) {
            cy.verifyElement({
                labelElement: feedbackRatingWidgetDetailsRatingsDataTableElements(index).ROW_PERCENTAGE,
                labelText: ratingsTable.percentages[index],
            });
        }

        cy.clickElement(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_TAB_COMMENTS);
        cy.scrollPageToBottom('.main-view');

        cy.verifyElement({
            labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements().COLUMN_NAME_RATING_LABEL,
            labelText: "Rating",
        });

        cy.verifyElement({
            labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements().COLUMN_NAME_TIME_LABEL,
            labelText: "Time",
        });

        cy.verifyElement({
            labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements().COLUMN_NAME_COMMENT_LABEL,
            labelText: "Comment",
        });

        cy.verifyElement({
            labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements().COLUMN_NAME_EMAIL_LABEL,
            labelText: "E-mail",
        });

        for (index = 0; index < commentsTable.ratings.length; index++) {
            cy.verifyElement({
                labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements(index).ROW_RATING,
                labelText: commentsTable.ratings[index],
            });
        }

        for (index = 0; index < commentsTable.ratings.length; index++) {
            cy.verifyElement({
                labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements(index).ROW_TIME,
                labelText: commentsTable.times,
            });
        }

        for (index = 0; index < commentsTable.comments.length; index++) {
            cy.verifyElement({
                labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements(index).ROW_COMMENT,
                labelText: commentsTable.comments[index],
            });
        }

        for (index = 0; index < commentsTable.emails.length; index++) {
            cy.verifyElement({
                labelElement: feedbackRatingWidgetDetailsCommentsDataTableElements(index).ROW_EMAIL,
                labelText: commentsTable.emails[index],
            });
        }
    }
};

const deleteWidget = () => {
    cy.clickElement(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_MORE_BUTTON);
    cy.clickElement(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_DELETE_BUTTON);
    cy.clickElement(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_DELETE_CONFIRM_BUTTON);
};

const shouldBeWidgetDeleted = (question) => {
    cy
        .elementExists(feedbackRatingWidgetsPageElements.RATINGS_WIDGETS_EMPTY_PAGE_ADD_NEW_WIDGET_BUTTON)
        .then((isExists) => {
            if (!isExists) {
                cy.getElement(widgetsDataTableElements().TABLE_ROWS).its('length').then((count) => {
                    for (var index = 0; index < (count / 2) - 1; index++) {
                        cy.shouldNotContainText(widgetsDataTableElements(index).WIDGET_NAME, question);
                    }
                });
            }
        });
};

const stopWidget = () => {
    cy.clickElement(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_STOP_WIDGET_BUTTON);
};

const shouldBeWidgetStopped = () => {
    cy.shouldContainText(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_STATUS_LABEL, 'Stopped');
};

const clickEditWidgetButton = () => {
    cy.clickElement(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_EDIT_WIDGET_BUTTON);
};

const clickBackToRatingWidgetLink = () => {
    cy.clickElement(feedbackRatingWidgetDetailsPageElements.RATINGS_WIDGET_DETAILS_BACK_TO_RATING_WIDGETS_LINK);
};

const createRatingWithApi = (username, password, appName, widgetName) => {

    let apiKey;
    let appId;
    let countlyToken;

    getApiKey.request(username, password)
        .then((response) => {
            apiKey = response;
            return getApps.request(apiKey);
        })
        .then((response) => {
            for (const key in response.admin_of) {
                if (response.admin_of[key].name === appName) {
                    appId = response.admin_of[key]._id;
                }
            }
            return getToken.request(apiKey);
        })
        .then((response) => {
            countlyToken = response.result;
            return createRating.request(countlyToken, appId, widgetName);
        });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifySettingsPageElements,
    verifyAppearancePageElements,
    verifyDevicesAndTargetingPageElements,
    verifySettingsPageDefaultElements,
    verifyAppearancePageDefaultElements,
    verifyDevicesAndTargetingPageDefaultElements,
    clickAddNewWidgetButton,
    clickNextStepButton,
    clickCancelButton,
    clickPreviousStepButton,
    clickSaveButton,
    clearQuestion,
    clearThanksMessage,
    typeWidgetName,
    typeQuestion,
    typeEmojiOneText,
    typeEmojiTwoText,
    typeEmojiThreeText,
    typeEmojiFourText,
    typeEmojiFiveText,
    clickAddCommentCheckbox,
    typeAddCommentCheckboxLabelText,
    clickContactViaCheckbox,
    typeContactViaCheckboxLabelText,
    clickAddUserConsentCheckbox,
    typeAddUserConsentText,
    typeAddUserConsentLinkText,
    typeAddUserConsentLinkUrl,
    typeButtonCallOut,
    typeThanksMessage,
    selectRatingSymbol,
    clickUseDefaultLogoRadioButton,
    clickUploadCustomLogoRadioButton,
    clickDontUseLogoRadioButton,
    uploadLogo,
    selectMainColor,
    selectFontColor,
    clickTriggerButtonSmallSizeRadioButton,
    clickTriggerButtonMediumSizeRadioButton,
    clickTriggerButtonLargeSizeRadioButton,
    clickCenterLeftPositionRadioButton,
    clickCenterRightPositionRadioButton,
    clickBottomLeftPositionRadioButton,
    clickBottomRightPositionRadioButton,
    typeTriggerText,
    clickHideStickerCheckbox,
    clickCloseIcon,
    clickShowOnlyCheckbox,
    typeShowOnlyPages,
    clickSetActiveCheckbox,
    verifyPreviewRatingsPopUpElements,
    verifyPreviewThankYouMessagePopUpElements,
    verifyPreviewTriggerButtonPopUpElements,
    verifyWidgetDataFromTable,
    getWidgetIdFromDataTable,
    shouldBeDisabledNextStepButton,
    shouldNotBeDisabledNextStepButton,
    searchWidgetOnDataTable,
    navigateToWidgetsDetailPage,
    verifyWidgetDetailsPageElements,
    deleteWidget,
    shouldBeWidgetDeleted,
    stopWidget,
    shouldBeWidgetStopped,
    clickBackToRatingWidgetLink,
    clickEditWidgetButton,
    createRatingWithApi
};
