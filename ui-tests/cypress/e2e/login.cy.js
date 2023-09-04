import user from '../fixtures/user.json'
const loginHelpers = require('../lib/login')
const navigationHelpers = require('../support/navigations')

describe('Login', () => {
	beforeEach(function () {
		navigationHelpers.goToLoginPage()
	})

	it('should be visible all elements on empty state', function () {
		loginHelpers.verifyEmptyPageElements()
	})

	it('should successfully log in to with valid username and password', function () {
		loginHelpers.typeUsername(user.username)
		loginHelpers.typePassword(user.password)
		loginHelpers.clickLoginButton()
		navigationHelpers.isNavigatedToDashboard()
	})

	it('should successfully log in to with valid e-mail and password', function () {
		loginHelpers.typeUsername(user.email)
		loginHelpers.typePassword(user.password)
		loginHelpers.clickLoginButton()
		navigationHelpers.isNavigatedToDashboard()
	})

	it('should display an error message with invalid password', function () {
		loginHelpers.typeUsername(user.email)
		loginHelpers.typePassword('invalidpassword')
		loginHelpers.clickLoginButton()
		loginHelpers.verifyLoginFailedMessage()
	})
})
