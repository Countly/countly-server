import feedbackRatingsPageElements from "../../../../support/elements/dashboard/feedback/ratings/ratings";

const verifyStaticElementsOfPage = () => {

    cy.verifyElement({
        element: feedbackRatingsPageElements.TAB_RATINGS,
        elementText: "Ratings",
    });

    cy.verifyElement({
        element: feedbackRatingsPageElements.TAB_RATING_WIDGETS,
        elementText: "Rating Widgets",
    });
    cy.verifyElement({
        labelElement: feedbackRatingsPageElements.PAGE_TITLE,
        labelText: "Ratings",
        tooltipElement: feedbackRatingsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "An overview of all ratings widgets set up in your application, including active and stopped ratings."
    });

    cy.verifyElement({
        element: feedbackRatingsPageElements.RESULTS_FOR_LABEL,
    });

    cy.verifyElement({
        element: feedbackRatingsPageElements.FILTER_PARAMETERS_COMBOBOX,
    });

    cy.verifyElement({
        element: feedbackRatingsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: feedbackRatingsPageElements.TOTAL_RATINGS_LABEL,
        labelText: "Total Ratings",
        tooltipElement: feedbackRatingsPageElements.TOTAL_RATINGS_TOOLTIP,
        tooltipText: "Total number of Ratings received from users."
    });

    cy.verifyElement({
        labelElement: feedbackRatingsPageElements.AVERAGE_RATINGS_SCORE_LABEL,
        labelText: "Average Ratings Score",
        tooltipElement: feedbackRatingsPageElements.AVERAGE_RATINGS_SCORE_TOOLTIP,
        tooltipText: "Average Ratings received calculated by Sum of Ratings / Ratings Count"
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        labelElement: feedbackRatingsPageElements.TOTAL_RATINGS_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        labelElement: feedbackRatingsPageElements.AVERAGE_RATINGS_SCORE_NUMBER_LABEL,
        labelText: "0",
    });

    cy.verifyElement({
        element: feedbackRatingsPageElements.EMPTY_CHART_ICON,
    });

    cy.verifyElement({
        labelElement: feedbackRatingsPageElements.EMPTY_CHART_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: feedbackRatingsPageElements.EMPTY_CHART_SUBTITLE,
        labelText: "No data found",
    });
};

const clickRatingsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(feedbackRatingsPageElements.TAB_RATINGS);
};

const clickRatingWidgetsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(feedbackRatingsPageElements.TAB_RATING_WIDGETS);
};

module.exports = {
    verifyEmptyPageElements,
    clickRatingsTab,
    clickRatingWidgetsTab
};