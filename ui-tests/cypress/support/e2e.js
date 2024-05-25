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
const fs = require('fs');
const path = require('path');
const networkLogPath = path.join(__dirname, '../logs/network.log');

//When Cypress detects uncaught errors originating from application it will automatically fail the current test.
//This behavior is configurable, and you can choose to turn this off by listening to the uncaught:exception event.
//Open the below code block after the "Cannot read properties of undefined..." errors occurred.
//But firstly open an issue about the error.
// Cypress.on('uncaught:exception', (err, runnable) => {
//     console.error('Uncaught exception:', err.message);
//     // returning false here prevents Cypress from failing the test
//     return false;
// });

if (fs.existsSync(networkLogPath)) {
    fs.truncateSync(networkLogPath, 0);
  }


Cypress.on('test:before:run', () => {
    // Her testten önce log dosyasını temizle
    fs.truncateSync(networkLogPath, 0);
  });