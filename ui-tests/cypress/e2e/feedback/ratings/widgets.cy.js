import user from '../../../fixtures/user.json'
const { generateWidgetFixture } = require('../../../fixtures/generators/widgets');
const navigationHelpers = require('../../../support/navigations')
const loginHelpers = require('../../../lib/login')
const widgetsHelpers = require('../../../lib/feedback/ratings/widgets')
const componentAddFeedbackSteps = require('../../../support/components/addFeedbackSteps')
const { FEEDBACK_TYPES, BEHAVIOUR_TYPES, COMPARISON_OPTIONS, TIME_PHRASES, TIME_UNITS, RATING_SYMBOLS, LOGICAL_OPERATORS } = require('../../../support/constants');
const demoWidgetPage = require('../../../lib/feedback/ratings/demoWidgetPage')

describe('Create New Widget', () => {
        beforeEach(function () {
                navigationHelpers.goToLoginPage()
                loginHelpers.login(user.username, user.password)
                navigationHelpers.goToFeedbackRatingsWidgetsPage()
        })

        it('Verify default values of page and create a widget with that values and then update the widget data', function () {
                widgetsHelpers.clickAddNewWidgetButton();
                widgetsHelpers.verifySettingsPageDefaultElements();
                widgetsHelpers.clickNextStepButton();
                widgetsHelpers.verifyAppearancePageDefaultElements();

                widgetsHelpers.verifyPreviewRatingsPopUpElements({
                        question: "What's your opinion about this page?",
                        emojiOneText: "Very Dissatisfied",
                        emojiTwoText: "Somewhat Dissatisfied",
                        emojiThreeText: "Neither Satisfied Nor Dissatisfied",
                        emojiFourText: "Somewhat Satisfied",
                        emojiFiveText: "Very Satisfied",
                        isCheckedAddComment: false,
                        commentCheckboxLabelText: "Add comment",
                        isCheckedViaContact: false,
                        viaContactCheckboxLabelText: "Contact me via e-mail",
                        submitButtonText: "Submit Feedback",
                        submitButtonColor: "#0166D6",
                        submitButtonFontColor: "#0166D6",
                        hasPoweredByLogo: true
                })

                widgetsHelpers.verifyPreviewThankYouMessagePopUpElements({
                        thankYouMessageText: "Thanks for your feedback!",
                        successIconColor: "#0166D6",
                        hasPoweredByLogo: true
                })

                widgetsHelpers.verifyPreviewTriggerButtonPopUpElements({
                        triggerButtonText: "Feedback",
                        triggerButtonColor: "#0166D6",
                        triggerButtonFontColor: "#0166D6"
                })

                widgetsHelpers.clickNextStepButton();
                widgetsHelpers.verifyDevicesAndTargetingPageDefaultElements();

                widgetsHelpers.verifyPreviewRatingsPopUpElements({
                        question: "What's your opinion about this page?",
                        emojiOneText: "Very Dissatisfied",
                        emojiTwoText: "Somewhat Dissatisfied",
                        emojiThreeText: "Neither Satisfied Nor Dissatisfied",
                        emojiFourText: "Somewhat Satisfied",
                        emojiFiveText: "Very Satisfied",
                        isCheckedAddComment: false,
                        commentCheckboxLabelText: "Add comment",
                        isCheckedViaContact: false,
                        viaContactCheckboxLabelText: "Contact me via e-mail",
                        submitButtonText: "Submit Feedback",
                        submitButtonColor: "#0166D6",
                        submitButtonFontColor: "#0166D6",
                        hasPoweredByLogo: true
                })

                widgetsHelpers.clickSaveButton();
                widgetsHelpers.verifyWidgetDataFromTable({
                        index: 0,
                        question: "What's your opinion about this page?",
                        pages: "/",
                        isActive: true
                })

                navigationHelpers.getAppNameFromSidebar().then((appName) => {
                        widgetsHelpers.getWidgetIdFromDataTable(0).then((widgetId) => {
                                demoWidgetPage.goToDemoWidgetPage(user.username, user.password, appName, widgetId)
                        });
                });

                demoWidgetPage.verifyDemoPageElements({
                        question: "What's your opinion about this page?",
                        emojiOneText: "Very Dissatisfied",
                        emojiTwoText: "Somewhat Dissatisfied",
                        emojiThreeText: "Neither Satisfied Nor Dissatisfied",
                        emojiFourText: "Somewhat Satisfied",
                        emojiFiveText: "Very Satisfied",
                        selectedEmojiItemIndex: 5,
                        submitButtonText: "Submit Feedback",
                        selectedMainColor: '#0166D6',
                        selectedFontColor: '#0166D6',
                        hasPoweredByLogo: true,
                        thankYouMessageText: 'Thanks for your feedback!',
                        successIconColor: '#0166D6'
                })

                //UPDATE CASE - Update widget data 
                navigationHelpers.goToDashboardPage()
                widgetsHelpers.navigateToWidgetsDetailPage("What's your opinion about this page?")

                widgetsHelpers.verifyWidgetDetailsPageElements({
                        question: "What's your opinion about this page?",
                        isActive: true,
                        //widgetId: "", TODO
                        ratingsValue: "1",
                        ratingsRate: "100%",
                        timesShownValue: "1",
                        rowIndex: "0",
                        rowRatingValue: "5",
                        // rowTimeValue: "", TODO
                        rowCommentValue: "No comment provided",
                        rowEmailValue: "No email provided"
                })

                widgetsHelpers.clickEditWidgetButton()

                const widget = generateWidgetFixture();

                widgetsHelpers.typeQuestion(widget.question);
                widgetsHelpers.typeEmojiOneText(widget.emojiOneText);
                widgetsHelpers.typeEmojiTwoText(widget.emojiTwoText);
                widgetsHelpers.typeEmojiThreeText(widget.emojiThreeText);
                widgetsHelpers.typeEmojiFourText(widget.emojiFourText);
                widgetsHelpers.typeEmojiFiveText(widget.emojiFiveText);
                widgetsHelpers.clickAddCommentCheckbox();
                widgetsHelpers.typeAddComment(widget.comment);
                widgetsHelpers.clickContactViaCheckbox();
                widgetsHelpers.typeContactVia(widget.contactVia)
                widgetsHelpers.typeButtonCallOut(widget.buttonCallOut);
                widgetsHelpers.typeThanksMessage(widget.thanksMessage);
                widgetsHelpers.clickNextStepButton();

                widgetsHelpers.selectRatingSymbol(RATING_SYMBOLS.STARS);
                widgetsHelpers.clickUploadCustomLogoRadioButton();
                widgetsHelpers.uploadLogo(widget.logoPath);
                widgetsHelpers.selectMainColor(widget.mainColor)
                widgetsHelpers.selectFontColor(widget.fontColor)
                widgetsHelpers.clickTriggerButtonLargeSizeRadioButton();
                widgetsHelpers.clickBottomRightPositionRadioButton();
                widgetsHelpers.typeTriggerText(widget.triggerText);
                widgetsHelpers.clickHideStickerCheckbox();

                widgetsHelpers.verifyPreviewRatingsPopUpElements({
                        question: widget.question,
                        emojiOneText: widget.emojiOneText,
                        emojiTwoText: widget.emojiTwoText,
                        emojiThreeText: widget.emojiThreeText,
                        emojiFourText: widget.emojiFourText,
                        emojiFiveText: widget.emojiFiveText,
                        isCheckedAddComment: true,
                        commentCheckboxLabelText: widget.comment,
                        isCheckedViaContact: true,
                        viaContactCheckboxLabelText: widget.contactVia,
                        submitButtonText: widget.buttonCallOut,
                        submitButtonColor: widget.mainColor,
                        submitButtonFontColor: widget.FontColor,
                        hasPoweredByLogo: true
                })

                widgetsHelpers.verifyPreviewThankYouMessagePopUpElements({
                        thankYouMessageText: widget.thanksMessage,
                        successIconColor: widget.mainColor,
                        hasPoweredByLogo: true
                })

                widgetsHelpers.verifyPreviewTriggerButtonPopUpElements({
                        triggerButtonText: widget.triggerText,
                        triggerButtonColor: widget.mainColor,
                        triggerButtonFontColor: widget.FontColor
                })

                widgetsHelpers.clickNextStepButton(),

                widgetsHelpers.clickShowOnlyCheckbox();
                widgetsHelpers.typeShowOnlyPages(...['/homepage', '/shopping', '/checkout'])

                widgetsHelpers.clickSaveButton();

                widgetsHelpers.clickBackToRatingWidgetLink()

                widgetsHelpers.verifyWidgetDataFromTable({
                        index: 0,
                        question: widget.question,
                        pages: "/homepage, /shopping, /checkout",
                        isActive: true
                })

                navigationHelpers.getAppNameFromSidebar().then((appName) => {
                        widgetsHelpers.getWidgetIdFromDataTable(0).then((widgetId) => {
                                demoWidgetPage.goToDemoWidgetPage(user.username, user.password, appName, widgetId)
                        });
                });

                demoWidgetPage.verifyDemoPageElements({
                        question: widget.question,
                        emojiOneText: widget.emojiOneText,
                        emojiTwoText: widget.emojiTwoText,
                        emojiThreeText: widget.emojiThreeText,
                        emojiFourText: widget.emojiFourText,
                        emojiFiveText: widget.emojiFiveText,
                        selectedEmojiItemIndex: 1,
                        isCheckedAddComment: true,
                        commentCheckboxLabelText: widget.comment,
                        isCheckedViaContact: true,
                        viaContactCheckboxLabelText: widget.contactVia,
                        submitButtonText: widget.submitButtonText,
                        selectedMainColor: widget.mainColor,
                        selectedFontColor: widget.FontColor,
                        hasPoweredByLogo: true,
                        thankYouMessageText: widget.thanksMessage,
                        successIconColor: widget.mainColor
                })

                //UPDATE CASE - Remove User Behaviour Segmentation and Update User Property Segmentation 
                navigationHelpers.goToDashboardPage()
                widgetsHelpers.navigateToWidgetsDetailPage(widget.question)

                widgetsHelpers.verifyWidgetDetailsPageElements({
                        question:widget.question,
                        isActive: true,
                        //widgetId: "", TODO
                        ratingsValue: "2",
                        ratingsRate: "100%",
                        timesShownValue: "2",
                        rowIndex: "0",
                        rowRatingValue: "1",
                        //rowTimeValue: "", TODO
                        //rowCommentValue: "", TODO
                        //rowEmailValue: "" TODO
                })

                widgetsHelpers.clickEditWidgetButton()

                componentAddFeedbackSteps.clickDevicesTargetingTab()

                widgetsHelpers.clickSaveButton();

                widgetsHelpers.clickBackToRatingWidgetLink()

                widgetsHelpers.verifyWidgetDataFromTable({
                        index: 0,
                        question: widget.question,
                        pages: "/homepage, /shopping, /checkout",
                        isActive: true
                })
        })

        it('Create a widget with updated text then stop the widget from details page', function () {
                const widget = generateWidgetFixture();

                widgetsHelpers.clickAddNewWidgetButton(),
                widgetsHelpers.typeQuestion(widget.question);
                widgetsHelpers.typeEmojiOneText(widget.emojiOneText);
                widgetsHelpers.typeEmojiTwoText(widget.emojiTwoText);
                widgetsHelpers.typeEmojiThreeText(widget.emojiThreeText);
                widgetsHelpers.typeEmojiFourText(widget.emojiFourText);
                widgetsHelpers.typeEmojiFiveText(widget.emojiFiveText);
                widgetsHelpers.clickAddCommentCheckbox();
                widgetsHelpers.typeAddComment(widget.comment);
                widgetsHelpers.clickContactViaCheckbox();
                widgetsHelpers.typeContactVia(widget.contactVia)
                widgetsHelpers.typeButtonCallOut(widget.buttonCallOut);
                widgetsHelpers.typeThanksMessage(widget.thanksMessage);
                widgetsHelpers.clickNextStepButton();

                widgetsHelpers.selectRatingSymbol(RATING_SYMBOLS.STARS);
                widgetsHelpers.clickUploadCustomLogoRadioButton();
                widgetsHelpers.uploadLogo(widget.logoPath);
                widgetsHelpers.selectMainColor(widget.mainColor)
                widgetsHelpers.selectFontColor(widget.fontColor)
                widgetsHelpers.clickTriggerButtonLargeSizeRadioButton();
                widgetsHelpers.clickBottomRightPositionRadioButton();
                widgetsHelpers.typeTriggerText(widget.triggerText);
                widgetsHelpers.clickHideStickerCheckbox();

                widgetsHelpers.verifyPreviewRatingsPopUpElements({
                        question: widget.question,
                        emojiOneText: widget.emojiOneText,
                        emojiTwoText: widget.emojiTwoText,
                        emojiThreeText: widget.emojiThreeText,
                        emojiFourText: widget.emojiFourText,
                        emojiFiveText: widget.emojiFiveText,
                        isCheckedAddComment: true,
                        commentCheckboxLabelText: widget.comment,
                        isCheckedViaContact: true,
                        viaContactCheckboxLabelText: widget.contactVia,
                        submitButtonText: widget.buttonCallOut,
                        submitButtonColor: widget.mainColor,
                        submitButtonFontColor: widget.FontColor,
                        hasPoweredByLogo: true
                })

                widgetsHelpers.verifyPreviewThankYouMessagePopUpElements({
                        thankYouMessageText: widget.thanksMessage,
                        successIconColor: widget.mainColor,
                        hasPoweredByLogo: true
                })

                widgetsHelpers.verifyPreviewTriggerButtonPopUpElements({
                        triggerButtonText: widget.triggerText,
                        triggerButtonColor: widget.mainColor,
                        triggerButtonFontColor: widget.FontColor
                })

                widgetsHelpers.clickNextStepButton(),

                widgetsHelpers.clickShowOnlyCheckbox();
                widgetsHelpers.typeShowOnlyPages(...['/homepage', '/shopping', '/checkout'])

                widgetsHelpers.clickSaveButton();

                widgetsHelpers.verifyWidgetDataFromTable({
                        index: 0,
                        question: widget.question,
                        pages: "/homepage, /shopping, /checkout",
                        isActive: true
                })

                navigationHelpers.getAppNameFromSidebar().then((appName) => {
                        widgetsHelpers.getWidgetIdFromDataTable(0).then((widgetId) => {
                                demoWidgetPage.goToDemoWidgetPage(user.username, user.password, appName, widgetId)
                        });
                });

                demoWidgetPage.verifyDemoPageElements({
                        question: widget.question,
                        emojiOneText: widget.emojiOneText,
                        emojiTwoText: widget.emojiTwoText,
                        emojiThreeText: widget.emojiThreeText,
                        emojiFourText: widget.emojiFourText,
                        emojiFiveText: widget.emojiFiveText,
                        isCheckedAddComment: true,
                        commentCheckboxLabelText: widget.comment,
                        isCheckedViaContact: true,
                        viaContactCheckboxLabelText: widget.contactVia,
                        submitButtonText: widget.submitButtonText,
                        selectedMainColor: widget.mainColor,
                        selectedFontColor: widget.FontColor,
                        hasPoweredByLogo: true,
                        thankYouMessageText: widget.thanksMessage,
                        successIconColor: widget.mainColor
                })

                navigationHelpers.goToDashboardPage()
                widgetsHelpers.navigateToWidgetsDetailPage(widget.question)

                widgetsHelpers.verifyWidgetDetailsPageElements({
                        question:widget.question,
                        isActive: true,
                        //widgetId: "", TODO
                        ratingsValue: "0",
                        ratingsRate: "0%",
                        timesShownValue: "1",
                        rowIndex: "0",
                        rowRatingValue: "undefined",
                        //rowTimeValue: "", TODO
                        //rowCommentValue: "", TODO
                        //rowEmailValue: "" TODO
                })

                widgetsHelpers.stopWidget()
                widgetsHelpers.shouldBeWidgetStopped()
                widgetsHelpers.clickBackToRatingWidgetLink()

                widgetsHelpers.verifyWidgetDataFromTable({
                        index: 0,
                        question: widget.question,
                        //BUG ALERT: After a rating widget's status changed, page is cleared. https://countly.atlassian.net/browse/SER-890
                        //pages: "/homepage, /shopping, /checkout",
                        isActive: false
                })
        })

        it('Verify next step button activation, the entered data exist when returning to the previous pages and creating a passive widget and deleting the widget', function () {
                const widget = generateWidgetFixture();

                widgetsHelpers.clickAddNewWidgetButton();
                widgetsHelpers.clearQuestion();
                widgetsHelpers.shouldBeDisabledNextStepButton();
                widgetsHelpers.typeQuestion(widget.question);
                widgetsHelpers.shouldNotBeDisabledNextStepButton();
                widgetsHelpers.clearThanksMessage();
                widgetsHelpers.shouldBeDisabledNextStepButton();
                widgetsHelpers.typeThanksMessage(widget.thanksMessage);
                widgetsHelpers.shouldNotBeDisabledNextStepButton();

                widgetsHelpers.typeEmojiOneText(widget.emojiOneText);
                widgetsHelpers.typeEmojiTwoText(widget.emojiTwoText);
                widgetsHelpers.typeEmojiThreeText(widget.emojiThreeText);
                widgetsHelpers.typeEmojiFourText(widget.emojiFourText);
                widgetsHelpers.typeEmojiFiveText(widget.emojiFiveText);
                widgetsHelpers.clickAddCommentCheckbox();
                widgetsHelpers.typeAddComment(widget.comment);
                widgetsHelpers.clickContactViaCheckbox();
                widgetsHelpers.typeContactVia(widget.contactVia)
                widgetsHelpers.typeButtonCallOut(widget.buttonCallOut);
                widgetsHelpers.clickNextStepButton();

                widgetsHelpers.selectRatingSymbol(RATING_SYMBOLS.STARS);
                widgetsHelpers.clickUploadCustomLogoRadioButton();
                widgetsHelpers.uploadLogo(widget.logoPath);
                widgetsHelpers.selectMainColor(widget.mainColor)
                widgetsHelpers.selectFontColor(widget.fontColor)
                widgetsHelpers.clickTriggerButtonLargeSizeRadioButton();
                widgetsHelpers.clickBottomRightPositionRadioButton();
                widgetsHelpers.typeTriggerText(widget.triggerText);
                widgetsHelpers.clickHideStickerCheckbox();
                widgetsHelpers.clickNextStepButton();

                widgetsHelpers.clickSetActiveCheckbox();
                componentAddFeedbackSteps.clickSettingsTab();

                widgetsHelpers.verifySettingsPageElements({
                        question: widget.question,
                        emojiOneText: widget.emojiOneText,
                        emojiTwoText: widget.emojiTwoText,
                        emojiThreeText: widget.emojiThreeText,
                        emojiFourText: widget.emojiFourText,
                        emojiFiveText: widget.emojiFiveText,
                        isCheckedAddComment: true,
                        commentText: widget.comment,
                        isCheckedViaContact: true,
                        viaContactText: widget.contactVia,
                        submitButtonText: widget.buttonCallOut,
                        thanksMessageText: widget.thanksMessage,
                })

                componentAddFeedbackSteps.clickAppearenceTab();

                widgetsHelpers.verifyAppearancePageElements({
                        ratingSymbol: RATING_SYMBOLS.STARS,
                        isLogoCustom: true,
                        selectedMainIconColor: widget.mainColor,
                        selectedFontIconColor: widget.fontColor,
                        isButtonSizeLarge: true,
                        isPositionBottomRight: true,
                        triggerText: widget.triggerText,
                        isHideSticker: true
                })

                componentAddFeedbackSteps.clickDevicesTargetingTab();

                widgetsHelpers.verifyDevicesAndTargetingPageElements({
                        isShowOnly: false,
                        isActive: false,
                })

                widgetsHelpers.clickSaveButton();
                widgetsHelpers.verifyWidgetDataFromTable({
                        question: widget.question,
                        pages: "/",
                        isActive: false
                })

                widgetsHelpers.navigateToWidgetsDetailPage(widget.question)
                widgetsHelpers.verifyWidgetDetailsPageElements({
                        question:widget.question,
                        isActive: false,
                        //widgetId: "", TODO
                        ratingsValue: "0",
                        ratingsRate: "0%",
                        timesShownValue: "0"
                })
                widgetsHelpers.deleteWidget()
                widgetsHelpers.shouldBeWidgetDeleted(widget.question)
        })
})
