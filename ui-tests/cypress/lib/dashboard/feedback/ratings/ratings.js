import {
    ratingsPageElements,
    ratingsMetricCardElements,
    ratingsEChartElements,
    ratingsDataTableElements,
    commentsDataTableElements
} from "../../../../support/elements/dashboard/feedback/ratings/ratings";

const verifyStaticElementsOfPage = () => {

    cy.verifyElement({
        element: ratingsPageElements.TAB_RATINGS,
        elementText: "Ratings",
    });

    cy.verifyElement({
        element: ratingsPageElements.TAB_RATING_WIDGETS,
        elementText: "Rating Widgets",
    });

    cy.verifyElement({
        labelElement: ratingsPageElements.PAGE_TITLE,
        labelText: "Ratings",
        tooltipElement: ratingsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "An overview of all ratings widgets set up in your application, including active and stopped ratings."
    });

    cy.verifyElement({
        element: ratingsPageElements.RESULTS_FOR_LABEL,
    });

    cy.verifyElement({
        element: ratingsPageElements.FILTER_PARAMETERS_COMBOBOX,
    });

    cy.verifyElement({
        element: ratingsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: ratingsPageElements.DATATABLE_TAB_RATINGS,
        elementText: "Ratings",
    });

    cy.verifyElement({
        element: ratingsPageElements.DATATABLE_TAB_COMMENTS,
        elementText: "Comments",
    });

    cy.verifyElement({
        labelElement: ratingsMetricCardElements.TOTAL_RATINGS_LABEL,
        labelText: "Total Ratings",
        tooltipElement: ratingsMetricCardElements.TOTAL_RATINGS_TOOLTIP,
        tooltipText: "Total number of Ratings received from users."
    });

    cy.verifyElement({
        labelElement: ratingsMetricCardElements.AVERAGE_RATINGS_SCORE_LABEL,
        labelText: "Average Ratings Score",
        tooltipElement: ratingsMetricCardElements.AVERAGE_RATINGS_SCORE_TOOLTIP,
        tooltipText: "Average Ratings received calculated by Sum of Ratings / Ratings Count"
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        labelElement: ratingsPageElements.DATATABLE_TAB_RATINGS,
        labelText: "Ratings",
    });

    cy.verifyElement({
        labelElement: ratingsPageElements.DATATABLE_TAB_COMMENTS,
        labelText: "Comments",
    });

    cy.verifyElement({
        element: ratingsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: ratingsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: ratingsDataTableElements().COLUMN_NAME_RATING_NAME_LABEL,
        elementText: "Rating",
    });

    cy.verifyElement({
        element: ratingsDataTableElements().COLUMN_NAME_RATING_NAME_SORTABLE_ICON,
    });


    cy.verifyElement({
        element: ratingsDataTableElements().COLUMN_NAME_NUMBER_OF_RATINGS_LABEL,
        elementText: "Number of Ratings",
    });

    cy.verifyElement({
        element: ratingsDataTableElements().COLUMN_NAME_NUMBER_OF_RATINGS_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: ratingsDataTableElements().COLUMN_NAME_PERCENTAGE_LABEL,
        elementText: "Percentage",
    });

    cy.verifyElement({
        element: ratingsDataTableElements().COLUMN_NAME_PERCENTAGE_SORTABLE_ICON,
    });

    clickDatatableCommentsTab();

    cy.scrollPageToBottom();

    cy.verifyElement({
        element: commentsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: commentsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: commentsDataTableElements().COLUMN_NAME_COMMENT_NAME_LABEL,
        elementText: "Comment",
    });

    cy.verifyElement({
        element: commentsDataTableElements().COLUMN_NAME_RATING_LABEL,
        elementText: "Rating",
    });

    cy.verifyElement({
        element: commentsDataTableElements().COLUMN_NAME_RATING_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: commentsDataTableElements().COLUMN_NAME_TIME_LABEL,
        elementText: "Time",
    });

    cy.verifyElement({
        element: commentsDataTableElements().COLUMN_NAME_TIME_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: commentsDataTableElements().COLUMN_NAME_E_MAIL_LABEL,
        elementText: "E-mail",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyRatingsMetricCard({
        isEmpty: true,
    });

    verifyRatingsEChartElements({
        isEmpty: true,
    });

    verifyRatingsDataFromTable({
        isEmpty: true,
    });

    verifyCommentsDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyRatingsMetricCard({
        isEmpty: false,
    });

    verifyRatingsEChartElements({
        isEmpty: false,
    });

    verifyRatingsDataFromTable({
        isEmpty: false,
    });

    verifyCommentsDataFromTable({
        isEmpty: false,
    });
};

const verifyRatingsMetricCard = ({
    isEmpty = false,
    totalRatings = null,
    averageRatingsScore = null,
}) => {

    if (isEmpty) {

        cy.scrollPageToTop();

        cy.verifyElement({
            labelElement: ratingsMetricCardElements.TOTAL_RATINGS_NUMBER_LABEL,
            labelText: "0",
        });

        cy.verifyElement({
            labelElement: ratingsMetricCardElements.AVERAGE_RATINGS_SCORE_NUMBER_LABEL,
            labelText: "0",
        });
        return;
    }

    cy.scrollPageToTop();

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: ratingsMetricCardElements.TOTAL_RATINGS_NUMBER_LABEL,
        labelText: totalRatings,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: ratingsMetricCardElements.AVERAGE_RATINGS_SCORE_NUMBER_LABEL,
        labelText: averageRatingsScore,
    });
};

const verifyRatingsEChartElements = ({
    isEmpty = false
}) => {

    if (isEmpty) {

        cy.scrollPageToTop();

        cy.verifyElement({
            element: ratingsEChartElements.EMPTY_CHART_ICON,
        });

        cy.verifyElement({
            labelElement: ratingsEChartElements.EMPTY_CHART_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: ratingsEChartElements.EMPTY_CHART_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.scrollPageToTop();

    cy.verifyElement({
        element: ratingsEChartElements.ECHARTS,
    });

    cy.verifyElement({
        element: ratingsEChartElements.MORE_BUTTON,
    });

    cy.verifyElement({
        element: ratingsEChartElements.RATING_ICON,
    });

    cy.pause();
    cy.verifyElement({
        element: ratingsEChartElements.RATING,
        elementText: "Ratings",
    });
    cy.pause();
};

const verifyRatingsDataFromTable = ({
    index = 0,
    isEmpty = false,
    rating = null,
    numberOfRatings = null,
    percentage = null,
}) => {

    clickDatatableRatingsTab();

    if (isEmpty) {

        cy.scrollPageToBottom();

        for (var i = 0; i < 5; i++) {
            cy.verifyElement({
                element: ratingsDataTableElements(i).RATING_ICON,
            });

            cy.verifyElement({
                element: ratingsDataTableElements(i).RATING,
                elementText: i + 1,
            });

            cy.verifyElement({
                labelElement: ratingsDataTableElements(i).NUMBER_OF_RATINGS,
                labelText: "0",
            });

            cy.verifyElement({
                labelElement: ratingsDataTableElements(i).PERCENTAGE,
                labelText: "0%",
            });
        }
        return;
    }

    cy.scrollPageToBottom();

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: ratingsDataTableElements(index).RATING,
        labelText: rating,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: ratingsDataTableElements(index).NUMBER_OF_RATINGS,
        labelText: numberOfRatings,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: ratingsDataTableElements(index).PERCENTAGE,
        labelText: percentage,
    });
};

const verifyCommentsDataFromTable = ({
    index = 0,
    isEmpty = false,
    comment = null,
    rating = null,
    time = null,
    email = null,
}) => {

    clickDatatableCommentsTab();

    if (isEmpty) {

        cy.scrollPageToBottom();

        cy.verifyElement({
            element: commentsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: commentsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: commentsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.scrollPageToBottom();

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: commentsDataTableElements(index).COMMENT,
        labelText: comment,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: commentsDataTableElements(index).RATING,
        labelText: rating,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: commentsDataTableElements(index).TIME,
        labelText: time,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: commentsDataTableElements(index).E_MAIL,
        labelText: email,
    });
};

const clickRatingsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(ratingsPageElements.TAB_RATINGS);
};

const clickRatingWidgetsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(ratingsPageElements.TAB_RATING_WIDGETS);
};

const clickDatatableRatingsTab = () => {
    cy.clickElement(ratingsPageElements.DATATABLE_TAB_RATINGS);
};

const clickDatatableCommentsTab = () => {
    cy.clickElement(ratingsPageElements.DATATABLE_TAB_COMMENTS);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickRatingsTab,
    clickRatingWidgetsTab,
    clickDatatableRatingsTab,
    clickDatatableCommentsTab,
    verifyRatingsMetricCard,
    verifyRatingsEChartElements,
    verifyRatingsDataFromTable,
    verifyCommentsDataFromTable
};