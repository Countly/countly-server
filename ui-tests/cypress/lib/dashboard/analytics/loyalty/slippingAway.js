import {
    slippingAwayPageElements,
    slippingAwayEChartElements,
    slippingAwayDataTableElements
} from "../../../../support/elements/dashboard/analytics/loyalty/slippingAway";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: slippingAwayPageElements.PAGE_TITLE,
        labelText: "Slipping Away",
        tooltipElement: slippingAwayPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Overview of the total number of users who haven't had a session on your application, distributed in categories of  7, 14, 30, 60, and 90 days. Granular data on these users can be made visible by activating User Profiles."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: slippingAwayPageElements.TAB_USER_ACTIVITY,
        elementText: "User Activity",
    });

    cy.verifyElement({
        element: slippingAwayPageElements.TAB_SLIPPING_AWAY,
        elementText: "Slipping Away",
    });

    cy.verifyElement({
        element: slippingAwayPageElements.TAB_TIMES_OF_DAY,
        elementText: "Times of Day",
    });

    cy.verifyElement({
        element: slippingAwayDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: slippingAwayDataTableElements().TABLE_SEARCH_INPUT,
        elementPlaceHolder: 'Search',
    });

    cy.verifyElement({
        labelElement: slippingAwayDataTableElements().COLUMN_NAME_NO_SESSION_IN_LABEL,
        isElementVisible: false,
        labelText: "No sessions in (days)",
    });

    cy.verifyElement({
        element: slippingAwayDataTableElements().COLUMN_NAME_NO_SESSION_IN_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: slippingAwayDataTableElements().COLUMN_NAME_SLIPPING_AWAY_USER_COUNT_LABEL,
        isElementVisible: false,
        labelText: "Slipping away user count",
    });

    cy.verifyElement({
        element: slippingAwayDataTableElements().COLUMN_NAME_SLIPPING_AWAY_USER_COUNT_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: slippingAwayDataTableElements().COLUMN_NAME_PERCENTAGE_LABEL,
        isElementVisible: false,
        labelText: "Percentage",
    });

    cy.verifyElement({
        element: slippingAwayDataTableElements().COLUMN_NAME_PERCENTAGE_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifySlippingAwayChart({
        isEmpty: true,
    });

    verifySlippingAwayDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifySlippingAwayChart({
        isEmpty: false,
    });

    verifySlippingAwayDataFromTable({
        isEmpty: false,
    });
};

const verifySlippingAwayChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: slippingAwayEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: slippingAwayEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: slippingAwayEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
    } else {

        cy.verifyElement({
            element: slippingAwayEChartElements.CHART_SLIPPING_AWAY_CHART,
        });

        cy.verifyElement({
            element: slippingAwayEChartElements.CHART_MORE_BUTTON,
        });

        cy.verifyElement({
            element: slippingAwayEChartElements.CHART_CHART_DESC_ICON,
            labelElement: slippingAwayEChartElements.CHART_CHART_DESC_LABEL,
            labelText: "Users who haven't had a session for more than",
        });
    }
};

const verifySlippingAwayDataFromTable = ({
    index = 0,
    isEmpty = false,
    slippingAwayUserCount = null,
    percentage = null,
}) => {

    cy.verifyElement({
        element: slippingAwayDataTableElements(0).NO_SESSION_IN,
        elementText: "7"
    });
    cy.verifyElement({
        element: slippingAwayDataTableElements(1).NO_SESSION_IN,
        elementText: "14"
    });
    cy.verifyElement({
        element: slippingAwayDataTableElements(2).NO_SESSION_IN,
        elementText: "30"
    });
    cy.verifyElement({
        element: slippingAwayDataTableElements(3).NO_SESSION_IN,
        elementText: "60"
    });
    cy.verifyElement({
        element: slippingAwayDataTableElements(4).NO_SESSION_IN,
        elementText: "90"
    });

    for (var i = 0; i < 5; i++) {
        cy.verifyElement({
            element: slippingAwayDataTableElements(i).PERCENTAGE_PROGRESS_BAR,
        });
    }

    if (isEmpty) {
        let i = 0;
        cy.scrollPageToBottom();

        for (i = 0; i < 5; i++) {
            cy.verifyElement({
                element: slippingAwayDataTableElements(i).SLIPPING_AWAY_USER_COUNT,
                elementText: '0'
            });
        }

        for (i = 0; i < 5; i++) {
            cy.verifyElement({
                element: slippingAwayDataTableElements(i).PERCENTAGE_VALUE,
                elementText: '0.00%'
            });
        }
    } else {
        cy.verifyElement({
            shouldNot: !isEmpty,
            element: slippingAwayDataTableElements(index).SLIPPING_AWAY_USER_COUNT,
            elementText: slippingAwayUserCount
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: slippingAwayDataTableElements(index).PERCENTAGE_VALUE,
            elementText: percentage
        });
    }
};

const clickUserActivityTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(slippingAwayPageElements.TAB_USER_ACTIVITY);
};

const clickSlippingAwayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(slippingAwayPageElements.TAB_SLIPPING_AWAY);
};

const clickTimesOfDayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(slippingAwayPageElements.TAB_TIMES_OF_DAY);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickUserActivityTab,
    clickSlippingAwayTab,
    clickTimesOfDayTab
};