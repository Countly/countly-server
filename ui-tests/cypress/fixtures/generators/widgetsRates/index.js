const { faker } = require('@faker-js/faker');

const generator = () => {
  const rating = faker.number.int({ min: 1, max: 5 });
  const comment = faker.lorem.words({ min: 1, max: 10 });
  const contactEmail = faker.internet.email();
  var createdDate = '';

  return {
    rating,
    comment,
    contactEmail,
    createdDate
  };
};

module.exports = {
  generateWidgetsRatesFixture: () => { return generator(); },
};