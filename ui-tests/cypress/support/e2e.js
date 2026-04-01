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
import { getDebugContext, clearDebugContext } from './debugContext';

// When Cypress detects uncaught errors originating from application it will automatically fail the current test.
// This behavior is configurable, and you can choose to turn this off by listening to the uncaught:exception event.
// Open the below code block after the "Cannot read properties of undefined..." errors occurred.
// But firstly open an issue about the error.
Cypress.on('uncaught:exception', () => false);

after(() => {
    cy.assertAll();
});

// Reset debug context before every test
beforeEach(() => {
    clearDebugContext();
});

// Global Cypress error formatter
Cypress.on('fail', (err, runnable) => {
    const ctx = getDebugContext();

    clearDebugContext();

    const url =
        Cypress.state('window') && Cypress.state('window').location
            ? Cypress.state('window').location.href
            : 'unknown';

    const actual =
        ctx.actual !== undefined
            ? ctx.actual
            : 'assertion failed before evaluation';

    const formattedError = `
========== CYPRESS FAILURE ==========

SPEC     : ${Cypress.spec?.name || 'unknown'}
SUITE    : ${runnable?.parent?.title || 'unknown'}
TEST     : ${runnable?.title || 'unknown'}
URL      : ${url}

SELECTOR : ${ctx.selector || 'unknown'}
ASSERT   : ${ctx.assertion || 'element exists'}
EXPECTED : ${ctx.expected ?? 'element should exist'}
ACTUAL   : ${actual}

ORIGINAL : ${err.message}

=====================================
`;

    err.message = formattedError;
    throw err;
});
