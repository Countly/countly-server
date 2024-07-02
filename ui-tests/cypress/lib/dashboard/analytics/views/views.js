import {
    viewsPageElements,
    viewsMetricCardElements,
    viewsEChartElements,
    viewsDataTableElements
} from "../../../../support/elements/dashboard/analytics/views/views";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: viewsPageElements.PAGE_TITLE,
        labelText: "Views",
        tooltipElement: viewsPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the data trends and metrics for the pages or screens viewed on your application, in the selected time period."
    });

    cy.verifyElement({
        element: viewsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        element: viewsPageElements.VIEWS_MORE_OPTION,
    });

    cy.verifyElement({
        labelElement: viewsEChartElements.VIEWED_BASED_ON_LABEL,
        labelText: "Views based on",
        element: viewsEChartElements.VIEWED_BASED_ON_SELECT,
        elementText: "Total Visits"
    });

    cy.verifyElement({
        labelElement: viewsEChartElements.FOR_LABEL,
        labelText: "for",
        element: viewsEChartElements.FOR_SELECT,
        elementText: "All Segments"
    });

    cy.verifyElement({
        element: viewsDataTableElements().VIEWS_FILTER,
    });

    cy.verifyElement({
        element: viewsDataTableElements().EDIT_VIEWS_BUTTON,
        elementText: "Edit views",
    });

    cy.verifyElement({
        element: viewsDataTableElements().DESELECT_ALL_BUTTON,
        elementText: "Deselect all",
    });

    cy.verifyElement({
        element: viewsDataTableElements().EDIT_COLOMNS_BUTTON,
    });

    cy.verifyElement({
        element: viewsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: viewsDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_VIEW_LABEL,
        isElementVisible: false,
        labelText: "View",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_VIEW_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_TOTAL_USERS_TILDE_LABEL,
        isElementVisible: false,
        labelText: "~",
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_TOTAL_USERS_LABEL,
        isElementVisible: false,
        labelText: "Total Users",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_TOTAL_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        tooltipElement: viewsDataTableElements().COLUMN_NAME_TOTAL_USERS_TOOLTIP,
        tooltipText: "Total (unique) value for this period is estimated and corrected using the biggest time buckets from available daily, weekly and monthly stats.<br /><br />Exact total counts are available for this year, month and day periods"
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_NEW_USERS_LABEL,
        isElementVisible: false,
        labelText: "New Users",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_NEW_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_TOTAL_VISITS_LABEL,
        isElementVisible: false,
        labelText: "Total Visits",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_TOTAL_VISITS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_LANDINGS_LABEL,
        isElementVisible: false,
        labelText: "Landings",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_LANDINGS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_EXITS_LABEL,
        isElementVisible: false,
        labelText: "Exits",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_EXITS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_AVG_TIME_LABEL,
        isElementVisible: false,
        labelText: "Avg. time",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_AVG_TIME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_BOUNCES_LABEL,
        isElementVisible: false,
        labelText: "Bounces",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_BOUNCES_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_BOUNCE_RATE_LABEL,
        isElementVisible: false,
        labelText: "Bounce Rate",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_BOUNCE_RATE_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: viewsDataTableElements().COLUMN_NAME_UNIQUE_VIEWS_LABEL,
        isElementVisible: false,
        labelText: "Unique Views",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: viewsDataTableElements().COLUMN_NAME_UNIQUE_VIEWS_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyViewsMetricCard({
        isEmpty: true,
    });

    verifyViewsChart({
        isEmpty: true,
    });

    verifyViewsDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyViewsMetricCard({
        isEmpty: false,
    });

    verifyViewsChart({
        isEmpty: false,
    });

    verifyViewsDataFromTable({
        isEmpty: false,
    });
};

const verifyViewsMetricCard = ({
    isEmpty = false,
    totalViewsValue = null,
    uniqueViews = null,
    bounceRatePercentage = null,
}) => {

    cy.scrollPageToTop();

    cy.verifyElement({
        labelElement: viewsMetricCardElements.TOTAL_VIEWS_LABEL,
        labelText: "Total Views",
        tooltipElement: viewsMetricCardElements.TOTAL_VIEWS_TOOLTIP,
        tooltipText: "The total number of pages viewed, in the selected time period."
    });

    cy.verifyElement({
        labelElement: viewsMetricCardElements.UNIQUE_VIEWS_LABEL,
        labelText: "Unique Views",
        tooltipElement: viewsMetricCardElements.UNIQUE_VIEWS_TOOLTIP,
        tooltipText: "Number of times a page is viewed in your application for the first time by users during a session, in the selected time period."
    });

    cy.verifyElement({
        labelElement: viewsMetricCardElements.BOUNCE_RATE_LABEL,
        labelText: "Bounce Rate",
        tooltipElement: viewsMetricCardElements.BOUNCE_RATE_TOOLTIP,
        tooltipText: "Number of users who have landed on a page without visiting other pages"
    });

    if (isEmpty) {
        cy.verifyElement({
            element: viewsMetricCardElements.TOTAL_VIEWS_VALUE,
            elementText: "0",
        });

        cy.verifyElement({
            element: viewsMetricCardElements.UNIQUE_VIEWS_VALUE,
            elementText: "0"
        });

        cy.verifyElement({
            element: viewsMetricCardElements.BOUNCE_RATE_VALUE,
            elementText: "0%"
        });
        return;
    }
    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsMetricCardElements.TOTAL_VIEWS_VALUE,
        elementText: totalViewsValue,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsMetricCardElements.UNIQUE_VIEWS_VALUE,
        elementText: uniqueViews
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsMetricCardElements.BOUNCE_RATE_VALUE,
        elementText: bounceRatePercentage
    });
};

const verifyViewsChart = ({
    isEmpty = false
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: viewsEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: viewsEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: viewsEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        element: viewsEChartElements.CHART_HOME_ICON,
        labelElement: viewsEChartElements.CHART_HOME_LABEL,
        labelText: "Home",
    });

    cy.verifyElement({
        element: viewsEChartElements.CHART_VIEWS,
    });

    cy.verifyElement({
        element: viewsEChartElements.CHART_TYPE_SELECT,
        elementPlaceHolder: "Select",
        value: "Line",
    });

    cy.verifyElement({
        element: viewsEChartElements.CHART_ANNOTATION_BUTTON,
    });

    cy.verifyElement({
        element: viewsEChartElements.CHART_MORE_BUTTON,
    });
};

const verifyViewsDataFromTable = ({
    index = 0,
    isEmpty = false,
    view = null,
    totalUsers = null,
    newUsers = null,
    totalVisits = null,
    landings = null,
    exits = null,
    avgTime = null,
    bounces = null,
    bounceRate = null,
    returningUsers = null,
}) => {

    if (isEmpty) {

        cy.verifyElement({
            element: viewsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: viewsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: viewsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        element: viewsDataTableElements(index).VIEW_CHECKBOX,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).VIEW,
        elementText: view
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).TOTAL_USERS,
        elementText: totalUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).NEW_USERS,
        elementText: newUsers
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).TOTAL_VISITS,
        elementText: totalVisits
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).LANDINGS,
        elementText: landings
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).EXITS,
        elementText: exits
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).AVG_TIME,
        elementText: avgTime
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).BOUNCES,
        elementText: bounces
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).BOUNCE_RATE,
        elementText: bounceRate
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: viewsDataTableElements(index).RETURNING_USERS,
        elementText: returningUsers
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyViewsMetricCard,
    verifyViewsChart,
    verifyViewsDataFromTable,
};