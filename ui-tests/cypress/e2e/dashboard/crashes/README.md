# Crashes End-to-End Tests

This directory contains end-to-end tests for the Crashes section of the Countly dashboard.

## Test Structure

The tests are organized into three main files:

1. **navigation.cy.js**: Tests basic navigation through the crashes section and verifies UI elements.
2. **functionality.cy.js**: Tests the functionality of the crashes section, such as filtering, actions on crash groups, etc.
3. **data-test-ids.cy.js**: Documents the data-test-id attributes that need to be added to the crashes section to make the tests more robust.
4. **helper-usage.cy.js**: Demonstrates how to use the helper functions from the crashes.js file to make tests more maintainable and reusable.

Additionally, there is a helper file in `ui-tests/cypress/lib/dashboard/crashes/crashes.js` that contains reusable functions for testing the crashes section.

## Running the Tests

To run the tests, you need to have Cypress installed. You can run the tests using the following command:

```bash
npx cypress run --spec "cypress/e2e/dashboard/crashes/*.cy.js"
```

Or to run a specific test file:

```bash
npx cypress run --spec "cypress/e2e/dashboard/crashes/navigation.cy.js"
```

To open Cypress in interactive mode:

```bash
npx cypress open
```

## Test Coverage

The tests cover the following areas:

### Navigation Tests
- Navigation to the crashes section
- Switching between crash groups and crash statistics tabs
- Navigation to crash group detail page
- Navigation to binary images view

### Helper Usage Tests
- Using helper functions to navigate through crash groups
- Using helper functions to filter crash groups
- Using helper functions to perform actions on crash groups
- Using helper functions to test crash statistics
- Using helper functions to test crash group detail functionality

### Functionality Tests
- Filtering crash groups by fatality, resolution status, etc.
- Actions on crash groups (mark as resolved, hidden, etc.)
- Crash statistics filters and graph switching
- Crash group detail page functionality (comments, marking as resolved, etc.)
- Binary images view

### Data Test IDs
The `data-test-ids.cy.js` file documents the data-test-id attributes that need to be added to the crashes section to make the tests more robust. This file serves as documentation for developers to add these attributes to the corresponding elements in the template files.

## Token-based Authentication

The tests use token-based authentication to log in to the Countly dashboard. The token URL is hardcoded in the tests. In a real-world scenario, you would want to store this token in a secure way, such as using Cypress environment variables.

## Adding Data-Test-IDs

To make the tests more robust, you should add data-test-id attributes to the elements in the crashes section. The `data-test-ids.cy.js` file documents the attributes that need to be added. You can add these attributes to the corresponding elements in the template files:

- `plugins/crashes/frontend/public/templates/overview.html`
- `plugins/crashes/frontend/public/templates/crashgroup.html`
- `plugins/crashes/frontend/public/templates/binary-images.html`
- `plugins/crashes/frontend/public/templates/stacktrace.html`

For example, to add a data-test-id to an element:

```html
<div data-test-id="crash-groups-auto-refresh-toggle">...</div>
```

## Maintenance

When making changes to the crashes section, make sure to update the tests accordingly. If you add new features, add tests for them. If you change existing features, update the tests to reflect the changes.
