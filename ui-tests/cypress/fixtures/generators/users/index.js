const { faker } = require('@faker-js/faker');
const helper = require('../../../../cypress/support/helper');

const generator = () => {

    const fullName = faker.lorem.words({ min: 1, max: 3 });
    const userName = faker.lorem.words({ min: 1, max: 1 });
    const password = helper.generateComplexPassword();
    const email = faker.internet.email().toLowerCase();

    return {
        fullName,
        userName,
        password,
        email,
    };
};

module.exports = {
    generateUsersFixture: () => {
        return generator();
    },
};