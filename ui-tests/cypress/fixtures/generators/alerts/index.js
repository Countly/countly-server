const { faker } = require('@faker-js/faker');

const generator = () => {
    const alertName = faker.lorem.words({ min: 3, max: 10 });
    const filterValue = faker.lorem.words({ min: 1, max: 2 });
    const triggerValue = faker.number.int({ min: 5, max: 100 });
    const email = faker.internet.email();

    return {
        alertName,
        filterValue,
        triggerValue,
        email
    };
};

module.exports = {
    generateAlertFixture: () => {
        return generator();
    },
};