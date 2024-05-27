import user from '../../../fixtures/user.json';
const { generateWidgetFixture } = require('../../../fixtures/generators/widgets');
const { generateWidgetsRatesFixture } = require('../../../fixtures/generators/widgetsRates');

const navigationHelpers = require('../../../support/navigations');
const loginHelpers = require('../../../lib/login');
const widgetsHelpers = require('../../../lib/feedback/ratings/widgets');
const componentAddFeedbackSteps = require('../../../support/components/addFeedbackSteps');
const { RATING_SYMBOLS } = require('../../../support/constants');
const demoWidgetPage = require('../../../lib/feedback/ratings/demoWidgetPage');
const helper = require('../../../support/helper');

describe('Create New Widget', () => {
    beforeEach(function() {
        navigationHelpers.goToLoginPage();
        loginHelpers.login(user.username, user.password);
        navigationHelpers.goToFeedbackRatingsWidgetsPage();
    });

    it('Verify default values of page and create a widget with that values and then update the widget data', function() {
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
            contactViaCheckboxLabelText: "Contact me via e-mail",
            submitButtonText: "Submit Feedback",
            submitButtonColor: "#0166D6",
            submitButtonFontColor: "#0166D6",
            hasPoweredByLogo: true
        });

        widgetsHelpers.verifyPreviewThankYouMessagePopUpElements({
            thankYouMessageText: "Thanks for your feedback!",
            successIconColor: "#0166D6",
            hasPoweredByLogo: true
        });

        widgetsHelpers.verifyPreviewTriggerButtonPopUpElements({
            triggerButtonText: "Feedback",
            triggerButtonColor: "#0166D6",
            triggerButtonFontColor: "#0166D6"
        });

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
            contactViaCheckboxLabelText: "Contact me via e-mail",
            submitButtonText: "Submit Feedback",
            submitButtonColor: "#0166D6",
            submitButtonFontColor: "#0166D6",
            hasPoweredByLogo: true
        });

        widgetsHelpers.clickSaveButton();
        widgetsHelpers.verifyWidgetDataFromTable({
            index: 0,
            question: "What's your opinion about this page?",
            pages: "/",
            isActive: true
        });

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            widgetsHelpers.getWidgetIdFromDataTable(0).then((widgetId) => {
                demoWidgetPage.goToDemoWidgetPage(user.username, user.password, appName, widgetId);
            });
        });

        demoWidgetPage.verifyDemoPageElementsAndRate({
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
        });

        //UPDATE CASE - Update widget data 
        navigationHelpers.goToDashboardPage();
        widgetsHelpers.navigateToWidgetsDetailPage("What's your opinion about this page?");

        widgetsHelpers.verifyWidgetDetailsPageElements({
            question: "What's your opinion about this page?",
            isActive: true,
            //widgetId: "", TODO
            ratingsValue: "1",
            ratingsRate: "100%",
            timesShownValue: "1",
            commentsTable: {
                ratings: [5],
                times: helper.getCurrentDate(),
                comments: ["No comment provided"],
                emails: ["No email provided"],
            },
            ratingsTable: {
                numberOfRatings: [0, 0, 0, 0, 1],
                percentages: [0, 0, 0, 0, 100],
            }
        });

        widgetsHelpers.clickEditWidgetButton();

        const widget = generateWidgetFixture();

        widgetsHelpers.typeQuestion(widget.question);
        widgetsHelpers.typeEmojiOneText(widget.emojiOneText);
        widgetsHelpers.typeEmojiTwoText(widget.emojiTwoText);
        widgetsHelpers.typeEmojiThreeText(widget.emojiThreeText);
        widgetsHelpers.typeEmojiFourText(widget.emojiFourText);
        widgetsHelpers.typeEmojiFiveText(widget.emojiFiveText);
        widgetsHelpers.clickAddCommentCheckbox();
        widgetsHelpers.typeAddCommentCheckboxLabelText(widget.addCommentCheckboxLabelText);
        widgetsHelpers.clickContactViaCheckbox();
        widgetsHelpers.typeContactViaCheckboxLabelText(widget.contactViaCheckboxLabelText);
        widgetsHelpers.typeButtonCallOut(widget.buttonCallOut);
        widgetsHelpers.typeThanksMessage(widget.thanksMessage);
        widgetsHelpers.clickNextStepButton();

        widgetsHelpers.selectRatingSymbol(RATING_SYMBOLS.STARS);
        widgetsHelpers.clickUploadCustomLogoRadioButton();
        widgetsHelpers.uploadLogo(widget.logoPath);
        widgetsHelpers.selectMainColor(widget.mainColor);
        widgetsHelpers.selectFontColor(widget.fontColor);
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
        });

        widgetsHelpers.verifyPreviewThankYouMessagePopUpElements({
            thankYouMessageText: widget.thanksMessage,
            successIconColor: widget.mainColor,
            hasPoweredByLogo: true
        });

        widgetsHelpers.verifyPreviewTriggerButtonPopUpElements({
            triggerButtonText: widget.triggerText,
            triggerButtonColor: widget.mainColor,
            triggerButtonFontColor: widget.FontColor
        });

        widgetsHelpers.clickNextStepButton(),

        widgetsHelpers.clickShowOnlyCheckbox();
        widgetsHelpers.typeShowOnlyPages(...['/homepage', '/shopping', '/checkout']);

        widgetsHelpers.clickSaveButton();

        widgetsHelpers.clickBackToRatingWidgetLink();

        widgetsHelpers.verifyWidgetDataFromTable({
            index: 0,
            question: widget.question,
            pages: "/homepage, /shopping, /checkout",
            isActive: true
        });

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            widgetsHelpers.getWidgetIdFromDataTable(0).then((widgetId) => {
                demoWidgetPage.goToDemoWidgetPage(user.username, user.password, appName, widgetId);
            });
        });

        const widgetRate = generateWidgetsRatesFixture();

        demoWidgetPage.verifyDemoPageElementsAndRate({
            question: widget.question,
            emojiOneText: widget.emojiOneText,
            emojiTwoText: widget.emojiTwoText,
            emojiThreeText: widget.emojiThreeText,
            emojiFourText: widget.emojiFourText,
            emojiFiveText: widget.emojiFiveText,
            selectedEmojiItemIndex: 1,
            commentCheckboxLabelText: widget.addCommentCheckboxLabelText,
            comment: widgetRate.comment,
            contactViaCheckboxLabelText: widget.contactViaCheckboxLabelText,
            contactEmail: widgetRate.contactEmail,
            submitButtonText: widget.submitButtonText,
            selectedMainColor: widget.mainColor,
            selectedFontColor: widget.FontColor,
            hasPoweredByLogo: true,
            thankYouMessageText: widget.thanksMessage,
            successIconColor: widget.mainColor
        });

        //UPDATE CASE 
        navigationHelpers.goToDashboardPage();
        widgetsHelpers.navigateToWidgetsDetailPage(widget.question);

        widgetsHelpers.verifyWidgetDetailsPageElements({
            question: widget.question,
            isActive: true,
            //widgetId: "", TODO
            ratingsValue: "2",
            ratingsRate: "100%",
            timesShownValue: "2",
            commentsTable: {
                ratings: [5, 1],
                times: helper.getCurrentDate(),
                comments: ["No comment provided", widgetRate.comment],
                emails: ["No email provided", widgetRate.contactEmail],
            },
            ratingsTable: {
                numberOfRatings: [1, 0, 0, 0, 1],
                percentages: [50, 0, 0, 0, 50],
            }
        });

        widgetsHelpers.clickEditWidgetButton();

        componentAddFeedbackSteps.clickDevicesTargetingTab();

        widgetsHelpers.clickSaveButton();

        widgetsHelpers.clickBackToRatingWidgetLink();

        widgetsHelpers.verifyWidgetDataFromTable({
            index: 0,
            question: widget.question,
            pages: "/homepage, /shopping, /checkout",
            isActive: true
        });
    });

    it('Create a widget with updated text then stop the widget from details page', function() {
        const widget = generateWidgetFixture();

        widgetsHelpers.clickAddNewWidgetButton(),
        widgetsHelpers.typeQuestion(widget.question);
        widgetsHelpers.typeEmojiOneText(widget.emojiOneText);
        widgetsHelpers.typeEmojiTwoText(widget.emojiTwoText);
        widgetsHelpers.typeEmojiThreeText(widget.emojiThreeText);
        widgetsHelpers.typeEmojiFourText(widget.emojiFourText);
        widgetsHelpers.typeEmojiFiveText(widget.emojiFiveText);
        widgetsHelpers.clickAddCommentCheckbox();
        widgetsHelpers.typeAddCommentCheckboxLabelText(widget.addCommentCheckboxLabelText);
        widgetsHelpers.clickContactViaCheckbox();
        widgetsHelpers.typeContactViaCheckboxLabelText(widget.contactViaCheckboxLabelText);
        widgetsHelpers.typeButtonCallOut(widget.buttonCallOut);
        widgetsHelpers.typeThanksMessage(widget.thanksMessage);
        widgetsHelpers.clickNextStepButton();

        widgetsHelpers.selectRatingSymbol(RATING_SYMBOLS.STARS);
        widgetsHelpers.clickUploadCustomLogoRadioButton();
        widgetsHelpers.uploadLogo(widget.logoPath);
        widgetsHelpers.selectMainColor(widget.mainColor);
        widgetsHelpers.selectFontColor(widget.fontColor);
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
        });

        widgetsHelpers.verifyPreviewThankYouMessagePopUpElements({
            thankYouMessageText: widget.thanksMessage,
            successIconColor: widget.mainColor,
            hasPoweredByLogo: true
        });

        widgetsHelpers.verifyPreviewTriggerButtonPopUpElements({
            triggerButtonText: widget.triggerText,
            triggerButtonColor: widget.mainColor,
            triggerButtonFontColor: widget.FontColor
        });

        widgetsHelpers.clickNextStepButton(),

        widgetsHelpers.clickShowOnlyCheckbox();
        widgetsHelpers.typeShowOnlyPages(...['/homepage', '/shopping', '/checkout']);

        widgetsHelpers.clickSaveButton();

        widgetsHelpers.verifyWidgetDataFromTable({
            index: 0,
            question: widget.question,
            pages: "/homepage, /shopping, /checkout",
            isActive: true
        });

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            widgetsHelpers.getWidgetIdFromDataTable(0).then((widgetId) => {
                demoWidgetPage.goToDemoWidgetPage(user.username, user.password, appName, widgetId);
            });
        });

        const widgetRate = generateWidgetsRatesFixture();

        demoWidgetPage.verifyDemoPageElementsAndRate({
            question: widget.question,
            emojiOneText: widget.emojiOneText,
            emojiTwoText: widget.emojiTwoText,
            emojiThreeText: widget.emojiThreeText,
            emojiFourText: widget.emojiFourText,
            emojiFiveText: widget.emojiFiveText,
            commentCheckboxLabelText: widget.addCommentCheckboxLabelText,
            comment: widgetRate.comment,
            contactViaCheckboxLabelText: widget.contactViaCheckboxLabelText,
            contactEmail: widgetRate.contactEmail,
            submitButtonText: widget.submitButtonText,
            selectedMainColor: widget.mainColor,
            selectedFontColor: widget.FontColor,
            hasPoweredByLogo: true,
            thankYouMessageText: widget.thanksMessage,
            successIconColor: widget.mainColor
        });

        navigationHelpers.goToDashboardPage();
        widgetsHelpers.navigateToWidgetsDetailPage(widget.question);

        widgetsHelpers.verifyWidgetDetailsPageElements({
            question: widget.question,
            isActive: true,
            //widgetId: "", TODO
            ratingsValue: "0",
            ratingsRate: "0%",
            timesShownValue: "1",
            commentsTable: {
                ratings: ["undefined"],
                times: helper.getCurrentDate(),
                comments: [widgetRate.comment],
                emails: [widgetRate.contactEmail],
            },
            ratingsTable: {
                numberOfRatings: [0, 0, 0, 0, 0],
                percentages: [0, 0, 0, 0, 0],
            }
        });

        widgetsHelpers.stopWidget();
        widgetsHelpers.shouldBeWidgetStopped();
        widgetsHelpers.clickBackToRatingWidgetLink();

        widgetsHelpers.verifyWidgetDataFromTable({
            index: 0,
            question: widget.question,
            //BUG ALERT: After a rating widget's status changed, page is cleared. https://countly.atlassian.net/browse/SER-890
            //pages: "/homepage, /shopping, /checkout",
            isActive: false
        });
    });

    it('Verify next step button activation, the entered data exist when returning to the previous pages and creating a passive widget and deleting the widget', function() {
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
        widgetsHelpers.typeAddCommentCheckboxLabelText(widget.addCommentCheckboxLabelText);
        widgetsHelpers.clickContactViaCheckbox();
        widgetsHelpers.typeContactViaCheckboxLabelText(widget.contactViaCheckboxLabelText);
        widgetsHelpers.typeButtonCallOut(widget.buttonCallOut);
        widgetsHelpers.clickNextStepButton();

        widgetsHelpers.selectRatingSymbol(RATING_SYMBOLS.STARS);
        widgetsHelpers.clickUploadCustomLogoRadioButton();
        widgetsHelpers.uploadLogo(widget.logoPath);
        widgetsHelpers.selectMainColor(widget.mainColor);
        widgetsHelpers.selectFontColor(widget.fontColor);
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
            addCommentCheckboxLabelText: widget.addCommentCheckboxLabelText,
            isCheckedViaContact: true,
            contactViaCheckboxLabelText: widget.contactViaCheckboxLabelText,
            submitButtonText: widget.buttonCallOut,
            thanksMessageText: widget.thanksMessage,
        });

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
        });

        componentAddFeedbackSteps.clickDevicesTargetingTab();

        widgetsHelpers.verifyDevicesAndTargetingPageElements({
            isShowOnly: false,
            isActive: false,
        });

        widgetsHelpers.clickSaveButton();
        widgetsHelpers.verifyWidgetDataFromTable({
            question: widget.question,
            pages: "/",
            isActive: false
        });

        widgetsHelpers.navigateToWidgetsDetailPage(widget.question);
        widgetsHelpers.verifyWidgetDetailsPageElements({
            question: widget.question,
            isActive: false,
            //widgetId: "", TODO
            ratingsValue: "0",
            ratingsRate: "0%",
            timesShownValue: "0",
            commentsTable: {},
            ratingsTable: {}
        });
        widgetsHelpers.deleteWidget();
        widgetsHelpers.shouldBeWidgetDeleted(widget.question);
    });

    it('Verify widget details comment and rating tab data', function() {
        widgetsHelpers.clickAddNewWidgetButton();
        const widget = generateWidgetFixture();

        let widgetRateOne = generateWidgetsRatesFixture();
        let widgetRateTwo = generateWidgetsRatesFixture();
        let widgetRateThree = generateWidgetsRatesFixture();
        let widgetRateFour = generateWidgetsRatesFixture();
        let widgetRateFive = generateWidgetsRatesFixture();

        widgetsHelpers.typeQuestion(widget.question);
        widgetsHelpers.clickAddCommentCheckbox();
        widgetsHelpers.clickContactViaCheckbox();
        widgetsHelpers.clickNextStepButton();
        widgetsHelpers.clickNextStepButton();
        widgetsHelpers.clickSaveButton();
        widgetsHelpers.verifyWidgetDataFromTable({
            index: 0,
            question: widget.question,
            isTargetingAllUsers: true,
            pages: "/",
            isActive: true
        });

        navigationHelpers.getAppNameFromSidebar().then((appName) => {
            widgetsHelpers.getWidgetIdFromDataTable(0).then((widgetId) => {
                demoWidgetPage.goToDemoWidgetPage(user.username, user.password, appName, widgetId);
            });
        });

        demoWidgetPage.verifyDemoPageElementsAndRate({
            selectedEmojiItemIndex: widgetRateOne.rating,
            comment: widgetRateOne.comment,
            contactEmail: widgetRateOne.contactEmail
        });

        cy.reload();

        demoWidgetPage.verifyDemoPageElementsAndRate({
            selectedEmojiItemIndex: widgetRateTwo.rating,
            comment: widgetRateTwo.comment,
            contactEmail: widgetRateTwo.contactEmail
        });

        cy.reload();

        demoWidgetPage.verifyDemoPageElementsAndRate({
            selectedEmojiItemIndex: widgetRateThree.rating,
            comment: widgetRateThree.comment,
            contactEmail: widgetRateThree.contactEmail
        });

        cy.reload();

        demoWidgetPage.verifyDemoPageElementsAndRate({
            selectedEmojiItemIndex: widgetRateFour.rating,
            comment: widgetRateFour.comment,
            contactEmail: widgetRateFour.contactEmail
        });

        cy.reload();

        demoWidgetPage.verifyDemoPageElementsAndRate({
            selectedEmojiItemIndex: widgetRateFive.rating,
            comment: widgetRateFive.comment,
            contactEmail: widgetRateFive.contactEmail
        });

        cy.reload();

        navigationHelpers.goToDashboardPage();
        widgetsHelpers.navigateToWidgetsDetailPage(widget.question);

        const result = helper.calculatePercentageRatings(...[widgetRateOne.rating, widgetRateTwo.rating, widgetRateThree.rating, widgetRateFour.rating, widgetRateFive.rating]);

        widgetsHelpers.verifyWidgetDetailsPageElements({
            ratingsValue: "5",
            ratingsRate: "83.33%",
            timesShownValue: "6",
            commentsTable: {
                ratings: [widgetRateOne.rating, widgetRateTwo.rating, widgetRateThree.rating, widgetRateFour.rating, widgetRateFive.rating],
                times: helper.getCurrentDate(),
                comments: [widgetRateOne.comment, widgetRateTwo.comment, widgetRateThree.comment, widgetRateFour.comment, widgetRateFive.comment],
                emails: [widgetRateOne.contactEmail, widgetRateTwo.contactEmail, widgetRateThree.contactEmail, widgetRateFour.contactEmail, widgetRateFive.contactEmail],
            },
            ratingsTable: {
                numberOfRatings: [result.counts[0], result.counts[1], result.counts[2], result.counts[3], result.counts[4]],
                percentages: [result.percentages[0], result.percentages[1], result.percentages[2], result.percentages[3], result.percentages[4]],
            }
        });
    });
});
