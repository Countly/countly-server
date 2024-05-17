const request = (apiKey) => {
    return new Cypress.Promise((resolve, reject) => {

        return cy.request({
            method: 'GET',
            url: `/i/token/create?purpose=Countly-Token&endpointquery=%5B%5D&multi=true&ttl=0&api_key=${apiKey}`,
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