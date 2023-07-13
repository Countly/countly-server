import loginPageElements from '../support/elements/login'

const typeUsername = username => {
	cy.typeInput(loginPageElements.USERNAME, username)
}

const typePassword = password => {
	cy.typeInput(loginPageElements.PASSWORD, password)
}

const clickLoginButton = () => {
	cy.clickElement(loginPageElements.LOGIN_BUTTON)
}

const verifyLoginFailedMessage = () => {
	cy.shouldBeVisible(loginPageElements.NOTIFICATION_IMAGE)
	cy.shouldContainText(loginPageElements.FAILED_MESSAGE, 'Login Failed')
}

const verifyUnvalidUsernameOrEmailMessage = () => {
	cy.shouldBeVisible(loginPageElements.USERNAME_ERROR_MESSAGE)
	cy.shouldContainText(
		loginPageElements.USERNAME_ERROR_MESSAGE,
		'Please enter a valid username or email.'
	)
}

const verifyEmptyPageElements = () => {
	cy.shouldBeVisible(loginPageElements.LOGO)
	cy.shouldBeVisible(loginPageElements.LANGUAGE)
	cy.shouldBeVisible(loginPageElements.SIGN_IN_LABEL)
	cy.shouldContainText(loginPageElements.SIGN_IN_LABEL, 'Sign In')
	cy.shouldBeVisible(loginPageElements.USERNAME)
	cy.get(loginPageElements.USERNAME)
		.invoke('attr', 'placeholder')
		.should('contain', 'Username or Email')
	cy.shouldBeVisible(loginPageElements.PASSWORD)
	cy.get(loginPageElements.PASSWORD)
		.invoke('attr', 'placeholder')
		.should('contain', 'Enter your password')
	cy.shouldBeVisible(loginPageElements.FORGOT_PASSWORD_LINK)
	cy.shouldContainText(
		loginPageElements.FORGOT_PASSWORD_LINK,
		'Forgot password?'
	)
	cy.get(loginPageElements.FORGOT_PASSWORD_LINK)
		.invoke('attr', 'href')
		.should('contain', './forgot')
	cy.shouldBeVisible(loginPageElements.LOGIN_BUTTON)
	cy.get(loginPageElements.LOGIN_BUTTON).should('have.value', 'Sign In')
	cy.shouldBeVisible(loginPageElements.FOOTER)

	cy.clickElement(loginPageElements.LOGIN_BUTTON)
	verifyUnvalidUsernameOrEmailMessage()
}

const login = (username, password) => {
	typeUsername(username)
	typePassword(password)
	clickLoginButton()
}

module.exports = {
	typeUsername,
	typePassword,
	clickLoginButton,
	verifyLoginFailedMessage,
	verifyUnvalidUsernameOrEmailMessage,
	verifyEmptyPageElements,
	login,
}
