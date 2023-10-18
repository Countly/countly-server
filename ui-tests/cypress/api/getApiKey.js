const base64 = require('base-64');

const request = (username, password) => {
  return new Cypress.Promise((resolve, reject) => {

    return cy.request({
      method: 'GET',
      url: '/api-key',
      headers: {
        accept: 'text/plain',
        authorization: `Basic ${base64.encode(username + ":" + password)}`,
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