const { faker } = require('@faker-js/faker');

const generator = () => {
    const dashboardName = faker.lorem.words({ min: 3, max: 10 });
    const email = faker.internet.email();

    return {
        dashboardName,
        email
    };
};

module.exports = {
    generateDashboardFixture: () => {
        return generator();
    },
};