const { faker } = require('@faker-js/faker');

const generator = () => {
    const reportName = faker.lorem.words({ min: 3, max: 10 });

    return {
        reportName
    };
};

module.exports = {
    generateReportFixture: () => {
        return generator();
    },
};