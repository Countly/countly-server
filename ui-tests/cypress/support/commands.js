Cypress.Commands.add('typeInput', (element, tag) => {
	cy.get(element).type(tag)
})

Cypress.Commands.add('shouldBeVisible', element => {
	cy.get(element).should('be.visible')
})

Cypress.Commands.add('shouldContainText', (element, text) => {
	cy.get(element).should('contain', text)
})

Cypress.Commands.add('shouldContainText', (element, text) => {
	cy.get(element).should('contain', text)
})

Cypress.Commands.add('clickElement', (element, index = 0) => {
	cy.get(element).eq(index).click()
})
