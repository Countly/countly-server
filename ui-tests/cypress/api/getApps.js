const base64 = require('base-64');

const request = (apiKey) => {
  return new Cypress.Promise((resolve, reject) => {

    return cy.request({
      method: 'GET',
      url: `/o/apps/mine?api_key=${apiKey}`,
      headers: {
        accept: 'text/plain',
      },
    })
      .then((response) => {
        const data = response.body || response.requestBody;
        return resolve(data);
      })
  })
};

module.exports = {
  request,
};