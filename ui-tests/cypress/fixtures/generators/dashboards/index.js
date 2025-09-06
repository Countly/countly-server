const { faker } = require('@faker-js/faker');

const generator = () => {
    const dashboardName = faker.lorem.words({ min: 3, max: 10 });

    return {
        dashboardName
    };
};

module.exports = {
    generateDashboardFixture: () => {
        return generator();
    },
};