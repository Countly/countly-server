import feedbackRatingsPageElements from "../../../../support/elements/dashboard/feedback/ratings/ratings";

const clickRatingWidgetsTab = () => {
    cy.clickElement(feedbackRatingsPageElements.TAB_RATINGS);
};

module.exports = {
    clickRatingWidgetsTab,
};
