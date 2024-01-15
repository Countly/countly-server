# Countly UI Automation / CYPRESS

- Technology Used : JavaScript
- Framework Used: Cypress

### Installation

- Firstly, clone the project with ssh to the local repo
- Then install all dependencies `npm install`
- Copy config sample and configure as you need `cp cypress.config.sample.js cypress.config.js`

### Running Tests

- Run `npm run cy:open`: Open the Cypress Test Runner
- Run `npm run cy:run`: Run Cypress tests to completion
- Run `npm run cy:run:login`: Run Cypress with login feature

### Dependencies

[Cypress](https://docs.cypress.io/)

- `npm install cypress`

[Faker](https://github.com/faker-js/faker)

- `npm install @faker-js/faker`

[Cypress-File-Upload](https://github.com/abramenal/cypress-file-upload)

- `npm install cypress-file-upload`

[Base-64](https://github.com/mathiasbynens/base64)

- `npm install base-64`

### Structure of Automation

#### e2e

- Includes test cases of features. Feature files are under the `cypress/e2e/{featureFolder}` and called as `{featureName}.cy.js`

  Exp; `cypress/e2e/analytics/loyalty/userActivity.cy.js`

#### Lib

//TO DO

#### Support

//TO DO

#### Fixtures

//TO DO

#### Commands

- Command file is under the `cypress/support` folder and the file has global commands

### Selector Priority //TO DO

- `“data-test-id”` is the first preference

```bash
Cypress.SelectorPlayground.defaults({
  selectorPriority: ['data-test-id', 'id', 'class']
})
```