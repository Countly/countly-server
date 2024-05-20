const request = ({ appKey, appVersion, os, events }) => {
    const baseUrl = Cypress.config('baseUrl');

    return new Cypress.Promise((resolve, reject) => {
        const metrics = JSON.stringify({ "_app_version": appVersion });
        const crash = JSON.stringify({ "_app_version": appVersion, "_error": "Error Message", "_os": os });
        const encodedEvents = encodeURIComponent(events);

        const url = `${baseUrl}/i?app_key=${appKey}&device_id=1&begin_session=1&metrics=${metrics}&events=${encodedEvents}&crash=${crash}`;

        return cy.request({
            method: 'GET',
            url: url,
            headers: {
                accept: 'text/plain',
            },
        })
            .then((response) => {
                const data = response.body || response.requestBody;
                return resolve(data);
            })
    });
};

module.exports = {
    request,
};