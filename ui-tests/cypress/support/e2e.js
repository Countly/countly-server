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

//When Cypress detects uncaught errors originating from application it will automatically fail the current test.
//This behavior is configurable, and you can choose to turn this off by listening to the uncaught:exception event.
//Open the below code block after the "Cannot read properties of undefined..." errors occurred.
//But firstly open an issue about the error.
Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from failing the test
    return false;
});

// Global Cypress error formatter.
// This handler intercepts test failures and enriches the CI logs with
// additional debugging context such as spec name, suite, test title,
// current URL, selector used, assertion type, and expected vs actual values.
//
// Purpose:
// Cypress default error messages in CI often lack sufficient context,
// making it difficult to understand where and why a test failed.
// This formatter provides a structured and readable failure output
// without requiring changes in existing test cases.
import { getDebugContext } from './debugContext'

Cypress.on('fail', (err, runnable) => {

  const ctx = getDebugContext()

  const url = Cypress.state('window')?.location?.href || 'unknown'

  const formattedError = `
========== CYPRESS FAILURE ==========

SPEC     : ${Cypress.spec?.name || 'unknown'}
SUITE    : ${runnable?.parent?.title || 'unknown'}
TEST     : ${runnable?.title || 'unknown'}
URL      : ${url}

SELECTOR : ${ctx.selector || 'unknown'}
ASSERT   : ${ctx.assertion || 'unknown'}
EXPECTED : ${ctx.expected ?? 'unknown'}
ACTUAL   : ${ctx.actual ?? 'unknown'}

ORIGINAL : ${err.message}

=====================================
`

  throw new Error(formattedError)
})