// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
require('cypress-failed-log');

//When Cypress detects uncaught errors originating from application it will automatically fail the current test.
//This behavior is configurable, and you can choose to turn this off by listening to the uncaught:exception event.
//Open the below code block after the "Cannot read properties of undefined..." errors occurred.
//But firstly open an issue about the error.
Cypress.on('uncaught:exception', (err, runnable) => {
    console.error('Uncaught exception:', err.message);
    // Log hatayı dosyaya yaz
    cy.writeFile('cypress/logs/errors.log', `${new Date().toISOString()} - Uncaught exception: ${err.message}\n`, { flag: 'a+' });
    return false;
});

Cypress.Commands.add('logRequest', (request) => {
    const logEntry = `${new Date().toISOString()} - ${request.method} ${request.url}\n`;
    cy.task('logNetworkRequest', logEntry);
});

Cypress.Commands.add('logResponse', (response) => {
    const logEntry = `${new Date().toISOString()} - ${response.statusCode} ${response.url}\n`;
    cy.task('logNetworkResponse', logEntry);
});

Cypress.on('test:before:run', () => {
    cy.task('clearNetworkLogs');
});