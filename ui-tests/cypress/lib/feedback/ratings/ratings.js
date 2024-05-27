import feedbackRatingsPageElements from "../../../support/elements/feedback/ratings/ratings";

const clickRatingWidgetsTab = () => {
    cy.clickElement(feedbackRatingsPageElements.RATING_WIDGETS_TAB);
};

module.exports = {
    clickRatingWidgetsTab,
};
