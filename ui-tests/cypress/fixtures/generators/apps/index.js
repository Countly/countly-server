const { faker } = require('@faker-js/faker');

const generator = () => {

    const appName = faker.lorem.words({ min: 1, max: 3 });
    const logoPath = 'testFiles/lowSizeTestImage.png';

    return {
        appName,
        logoPath,
    };
};

module.exports = {
    generateAppsFixture: () => {
        return generator();
    },
};