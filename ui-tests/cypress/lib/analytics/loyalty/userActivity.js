import analyticsLoyaltyUserActivityPageElements from "../../../support/elements/analytics/loyalty/userActivity";

const verifyEmptyPageElements = () => {
  cy.shouldBeVisible(analyticsLoyaltyUserActivityPageElements.VISITOR_ACTIVITY_LABEL)
  cy.shouldContainText(analyticsLoyaltyUserActivityPageElements.VISITOR_ACTIVITY_LABEL, "User Activity")
};

module.exports = {
  verifyEmptyPageElements,
};
