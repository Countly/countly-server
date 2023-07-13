import sidebarElements from '../support/elements/sidebar'

const goToLoginPage = () => {
	cy.visit('/login')
}

const goToLogoutPage = () => {
	cy.visit('/logout')
}

const goToHomePage = () => {
	cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU)
	cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.HOME)
}

const goToVisitorLoyalty = () => {
	cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.MAIN_MENU)
	cy.wait(500)
	cy.clickElement(sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS, 1)
	cy.clickElement(
		sidebarElements.SIDEBAR_MAIN_MENU_OPTIONS.ANALYTICS_LIST.VISITOR_LOYALTY
	)
}

const isNavigatedToDashboard = () => {
	cy.url().should('include', '/dashboard')
	cy.shouldBeVisible(sidebarElements.SIDEBAR)
}

module.exports = {
	goToLoginPage,
	goToLogoutPage,
	goToHomePage,
	goToVisitorLoyalty,
	isNavigatedToDashboard,
}
