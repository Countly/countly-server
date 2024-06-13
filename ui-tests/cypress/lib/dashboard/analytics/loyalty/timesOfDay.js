import {
    timesOfDayPageElements,
    timesOfDayEChartElements,
    timesOfDayDataTableElements
} from "../../../../support/elements/dashboard/analytics/loyalty/timesOfDay";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: timesOfDayPageElements.PAGE_TITLE,
        labelText: "Times of Day",
        tooltipElement: timesOfDayPageElements.PAGE_TITLE_TOOLTIP,
        tooltipText: "Scatter plot chart with times and days of Session and Event occurrences in your application, based on users' local time."
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: timesOfDayPageElements.TAB_USER_ACTIVITY,
        elementText: "User Activity",
    });

    cy.verifyElement({
        element: timesOfDayPageElements.TAB_SLIPPING_AWAY,
        elementText: "Slipping Away",
    });

    cy.verifyElement({
        element: timesOfDayPageElements.TAB_TIMES_OF_DAY,
        elementText: "Times of Day",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_HOURS_LABEL,
        isElementVisible: false,
        labelText: "Hours",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_MONDAY_LABEL,
        isElementVisible: false,
        labelText: "Monday",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_TUESDAY_LABEL,
        isElementVisible: false,
        labelText: "Tuesday",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_WEDNESDAY_LABEL,
        isElementVisible: false,
        labelText: "Wednesday",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_THURSDAY_LABEL,
        isElementVisible: false,
        labelText: "Thursday",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_FRIDAY_LABEL,
        isElementVisible: false,
        labelText: "Friday",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_SATURDAY_LABEL,
        isElementVisible: false,
        labelText: "Saturday",
    });

    cy.verifyElement({
        labelElement: timesOfDayDataTableElements().COLUMN_NAME_SUNDAY_LABEL,
        isElementVisible: false,
        labelText: "Sunday",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyTimesOfDayChart({
        isEmpty: true,
    });

    verifyTimesOfDayDataFromTable({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyTimesOfDayChart({
        isEmpty: false,
    });

    verifyTimesOfDayDataFromTable({
        isEmpty: false,
    });
};

const verifyTimesOfDayChart = ({
    isEmpty = false,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: timesOfDayEChartElements.EMPTY_PAGE_ICON,
        });

        cy.verifyElement({
            labelElement: timesOfDayEChartElements.EMPTY_PAGE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: timesOfDayEChartElements.EMPTY_PAGE_SUBTITLE,
            labelText: "No data found",
        });
    }
    else {

        cy.verifyElement({
            element: timesOfDayEChartElements.CHART_SLIPPING_AWAY_CHART,
        });

        cy.verifyElement({
            element: timesOfDayEChartElements.CHART_MORE_BUTTON,
        });
    }
};

const verifyTimesOfDayDataFromTable = ({
    index = 0,
    isEmpty = false,
    monday = null,
    tuesday = null,
    wednesday = null,
    thursday = null,
    friday = null,
    saturday = null,
    sunday = null,
}) => {

    cy.verifyElement({
        element: timesOfDayDataTableElements(0).HOURS,
        elementText: "00:00-01:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(1).HOURS,
        elementText: "01:00-02:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(2).HOURS,
        elementText: "02:00-03:00"
    });

    cy.scrollPageToBottom();

    cy.verifyElement({
        element: timesOfDayDataTableElements(3).HOURS,
        elementText: "03:00-04:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(4).HOURS,
        elementText: "04:00-05:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(5).HOURS,
        elementText: "05:00-06:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(6).HOURS,
        elementText: "06:00-07:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(7).HOURS,
        elementText: "07:00-08:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(8).HOURS,
        elementText: "08:00-09:00"
    });
    cy.verifyElement({
        element: timesOfDayDataTableElements(9).HOURS,
        elementText: "09:00-10:00"
    });

    if (isEmpty) {

        let i = 0;
        cy.scrollPageToBottom();

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: timesOfDayDataTableElements(i).MONDAY,
                elementText: '0'
            });
        }

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: timesOfDayDataTableElements(i).TUESDAY,
                elementText: '0'
            });
        }

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: timesOfDayDataTableElements(i).WEDNESDAY,
                elementText: '0'
            });
        }

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: timesOfDayDataTableElements(i).THURSDAY,
                elementText: '0'
            });
        }

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: timesOfDayDataTableElements(i).FRIDAY,
                elementText: '0'
            });
        }

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: timesOfDayDataTableElements(i).SATURDAY,
                elementText: '0'
            });
        }

        cy.scrollDataTableToRight();

        for (i = 0; i < 10; i++) {
            cy.verifyElement({
                element: timesOfDayDataTableElements(i).SUNDAY,
                elementText: '0'
            });
        }

    }
    else {

        cy.scrollPageToBottom();

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: timesOfDayDataTableElements(index).MONDAY,
            elementText: monday
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: timesOfDayDataTableElements(index).TUESDAY,
            elementText: tuesday
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: timesOfDayDataTableElements(index).WEDNESDAY,
            elementText: wednesday
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: timesOfDayDataTableElements(index).THURSDAY,
            elementText: thursday
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: timesOfDayDataTableElements(index).FRIDAY,
            elementText: friday
        });

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: timesOfDayDataTableElements(index).SATURDAY,
            elementText: saturday
        });

        cy.scrollDataTableToRight();

        cy.verifyElement({
            shouldNot: !isEmpty,
            element: timesOfDayDataTableElements(index).SUNDAY,
            elementText: sunday
        });
    }
};

const clickUserActivityTab = () => {
    cy.clickElement(timesOfDayPageElements.TAB_USER_ACTIVITY);
};

const clickSlippingAwayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(timesOfDayPageElements.TAB_SLIPPING_AWAY);
};

const clickTimesOfDayTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(timesOfDayPageElements.TAB_TIMES_OF_DAY);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickUserActivityTab,
    clickSlippingAwayTab,
    clickTimesOfDayTab
};