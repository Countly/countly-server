Cypress.Commands.add("typeInput", (element, tag) => {
  cy.get(element).type(tag);
});

Cypress.Commands.add("clickElement", (element, index = 0) => {
  cy.get(element).eq(index).click({force: true});
  cy.checkPaceRunning();
});

Cypress.Commands.add("shouldBeVisible", (element) => {
  cy.get(element).should("be.visible");
});

Cypress.Commands.add("shouldContainText", (element, text) => {
  cy.get(element).should("contain", text);
});

Cypress.Commands.add("shouldPlaceholderContainText", (element, text) => {
  cy.get(element).invoke("attr", "placeholder").should("contain", text);
});

Cypress.Commands.add("shouldHrefContainUrl", (element, url) => {
  cy.get(element).invoke("attr", "href").should("contain", url);
});

Cypress.Commands.add("shouldHaveValue", (element, value) => {
  cy.get(element).should("have.value", value);
});

Cypress.Commands.add("shouldUrlInclude", (url) => {
  cy.url().should('include', url)
});

Cypress.Commands.add('elementExists', (selector) => {
  cy
    .get('body')
    .then(($body) => {
      return $body.find(selector).length > 0;
    });
});

Cypress.Commands.add('shouldNotExist', (element) => {
  cy.get(element).should('not.exist');
});

Cypress.Commands.add('checkPaceRunning', () => {
  cy
    .elementExists('.pace-running')
    .then((isExists) => {
      if (isExists) {
        cy.shouldNotExist('.pace-running');
      }
    });
});
