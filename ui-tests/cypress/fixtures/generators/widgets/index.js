const { faker } = require('@faker-js/faker');

const generator = () => {
    const widgetName = faker.lorem.words({ min: 3, max: 10 });
    const question = faker.lorem.words({ min: 3, max: 10 }) + '?';
    const emojiOneText = faker.lorem.words({ min: 1, max: 3 });
    const emojiTwoText = faker.lorem.words({ min: 1, max: 3 });
    const emojiThreeText = faker.lorem.words({ min: 1, max: 3 });
    const emojiFourText = faker.lorem.words({ min: 1, max: 3 });
    const emojiFiveText = faker.lorem.words({ min: 1, max: 3 });
    const addCommentCheckboxLabelText = faker.lorem.words({ min: 1, max: 3 });
    const contactViaCheckboxLabelText = faker.lorem.words({ min: 1, max: 3 });
    const buttonCallOut = faker.lorem.words({ min: 1, max: 3 });
    const thanksMessage = faker.lorem.words({ min: 1, max: 3 });
    const mainColor = faker.color.rgb({ format: 'hex', casing: 'upper' });
    const fontColor = faker.color.rgb({ format: 'hex', casing: 'upper' });
    const triggerText = faker.lorem.words({ min: 1, max: 3 });
    const logoPath = '/testFiles/lowSizeTestImage.png';

    return {
        widgetName,
        question,
        emojiOneText,
        emojiTwoText,
        emojiThreeText,
        emojiFourText,
        emojiFiveText,
        addCommentCheckboxLabelText,
        contactViaCheckboxLabelText,
        buttonCallOut,
        thanksMessage,
        mainColor,
        fontColor,
        triggerText,
        logoPath
    };
};

module.exports = {
    generateWidgetFixture: () => {
        return generator();
    },
};