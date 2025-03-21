const { faker } = require('@faker-js/faker');

const generator = () => {

    function generateComplexPassword(length = 12) {
        if (length < 8) {
            length = 8;
        }

        const uppercase = faker.string.alpha({ casing: 'upper', length: 2 });
        const lowercase = faker.string.alpha({ casing: 'lower', length: 2 });
        const numbers = faker.string.numeric(2);
        const specialChars = "!@#$%^&*()_+[]{}|;:,.<>?/".split('');
        const special = Array.from({ length: 2 }, () => faker.helpers.arrayElement(specialChars)).join('');

        const remainingLength = length - (uppercase.length + lowercase.length + numbers.length + special.length);
        const remaining = faker.string.alphanumeric(remainingLength);

        const password = uppercase + lowercase + numbers + special + remaining;
        return faker.helpers.shuffle(password.split('')).join('');
    }

    const fullName = faker.lorem.words({ min: 1, max: 3 });
    const userName = faker.lorem.words({ min: 1, max: 1 });
    const password = generateComplexPassword();
    const email = faker.internet.email().toLowerCase();
    // TODO: SER-2348
    // const logoPath = '/testFiles/lowSizeTestImage.jpg';

    return {
        fullName,
        userName,
        password,
        email,
        // TODO: SER-2348
        //logoPath
    };
};

module.exports = {
    generateUsersFixture: () => {
        return generator();
    },
};