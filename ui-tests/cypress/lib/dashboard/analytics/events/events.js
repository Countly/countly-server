import {
    eventsPageElements,
    eventStatsListBoxElements,
    eventStatsEChartElements,
    eventStatsDataTableElements,
    compareEventsEChartElements,
    compareEventsDataTableElements
} from "../../../../support/elements/dashboard/analytics/events/events";

const helper = require('../../../../support/helper');

const verifyStaticElementsOfEventStatsPage = () => {

    clickEventStatsTab();

    cy.verifyElement({
        labelElement: eventsPageElements.PAGE_TITLE,
        labelText: "All Events"
    });

    cy.verifyElement({
        element: eventsPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        labelElement: eventStatsEChartElements.PERIOD_LABEL,
        labelText: "PERIOD"
    });

    cy.verifyElement({
        element: eventsPageElements.FILTER_DATE_PICKER,
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: eventsPageElements.TAB_EVENT_STATS,
        elementText: "Event Stats",
    });

    cy.verifyElement({
        element: eventsPageElements.TAB_COMPARE_EVENTS,
        elementText: "Compare Events",
    });

    cy.verifyElement({
        element: eventStatsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: eventStatsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: eventStatsDataTableElements().COLUMN_NAME_DATE_LABEL,
        elementText: "Date",
    });

    cy.verifyElement({
        element: eventStatsDataTableElements().COLUMN_NAME_DATE_SORTABLE_ICON,
    });
};

const verifyStaticElementsOfCompareEventsPage = () => {

    clickCompareEventsTab();

    cy.verifyElement({
        labelElement: eventsPageElements.PAGE_TITLE,
        labelText: "Compare Events"
    });

    cy.verifyElement({
        element: eventsPageElements.SELECT_EVENTS_COMBOBOX,
    });

    cy.verifyElement({
        element: eventsPageElements.SELECT_EVENTS_COMBOBOX_INPUT,
        elementPlaceHolder: "Select maximum 20 events to compare",
    });

    cy.verifyElement({
        element: eventsPageElements.COMPARE_BUTTON,
    });

    cy.verifyElement({
        element: eventsPageElements.FILTER_DATE_PICKER,
    });

    cy.verifyElement({
        labelElement: eventsPageElements.RESULTS_BY_LABEL,
        labelText: "Results by"
    });

    cy.verifyElement({
        element: eventsPageElements.COUNT_BUTTON,
        elementText: "Count"
    });

    cy.scrollPageToTop();

    cy.verifyElement({
        element: eventsPageElements.TAB_EVENT_STATS,
        elementText: "Event Stats",
    });

    cy.verifyElement({
        element: eventsPageElements.TAB_COMPARE_EVENTS,
        elementText: "Compare Events",
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_EVENT_LABEL,
        elementText: "EVENT",
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_EVENT_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_COUNT_LABEL,
        elementText: "COUNT",
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_COUNT_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_SUM_LABEL,
        elementText: "SUM",
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_SUM_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_DURATION_LABEL,
        elementText: "DURATION",
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_DURATION_SORTABLE_ICON,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_AVG_DURATION_LABEL,
        elementText: "AVG. DURATION",
    });

    cy.verifyElement({
        element: compareEventsDataTableElements().COLUMN_NAME_AVG_DURATION_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfEventStatsPage();

    verifyEventStatsListBoxElements({
        isEmpty: true,
    });

    verifyEventStatsEChartElements({
        isEmpty: true,
    });

    verifyEventStatsDataTableElements({
        isEmpty: true,
    });

    verifyStaticElementsOfCompareEventsPage();

    verifyCompareEventsEChartElements({
        isEmpty: true,
    });

    verifyCompareEventsDataTableElements({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    cy.clickElement(eventStatsListBoxElements('Bill Payment').LIST_BOX_ITEM);

    verifyStaticElementsOfEventStatsPage();

    verifyEventStatsListBoxElements({
        isEmpty: false,
    });

    verifyEventStatsEChartElements({
        isEmpty: false,
    });

    verifyEventStatsDataTableElements({
        isEmpty: false,
    });

    verifyStaticElementsOfCompareEventsPage();

    selectEventsToCompare('Credit Card Application');
    clickCompare();

    verifyCompareEventsEChartElements({
        isEmpty: false,
    });

    verifyCompareEventsDataTableElements({
        isEmpty: false,
    });
};

const verifyEventStatsListBoxElements = ({
    isEmpty = false,
    eventName = 'Bill Payment'
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: eventStatsListBoxElements().LIST_BOX_SEARCH_INPUT,
            elementPlaceHolder: "Search in 0 Events",
        });

        cy.verifyElement({
            labelElement: eventStatsListBoxElements().LIST_BOX_NO_MATCH_FOUND_LABEL,
            labelText: "No match found",
        });

        return;
    }

    cy.verifyElement({
        element: eventStatsListBoxElements().LIST_BOX_SEARCH_INPUT,
        elementPlaceHolder: "Search in 13 Events",
    });

    cy.verifyElement({
        element: eventStatsListBoxElements().LIST_BOX,
    });

    cy.verifyElement({
        element: eventStatsListBoxElements(eventName).LIST_BOX_ITEM,
        elementText: eventName,
    });
};

const verifyEventStatsEChartElements = ({
    isEmpty = false,
    eventName = 'Bill Payment',
    countNumber = null,
    countPercantage = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: eventStatsEChartElements.EMPTY_CHART_ICON,
        });

        cy.verifyElement({
            labelElement: eventStatsEChartElements.EMPTY_CHART_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: eventStatsEChartElements.EMPTY_CHART_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        labelElement: eventStatsEChartElements.SEGMENTATION_BY_LABEL,
        labelText: "SEGMENTATION BY"
    });

    cy.verifyElement({
        element: eventStatsEChartElements.SEGMENTATION_SELECT,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.PERIOD_LABEL,
        elementText: "PERIOD",
    });

    cy.verifyElement({
        element: eventStatsEChartElements.EVENT_TITLE,
        elementText: eventName,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART_TYPE_SELECT,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART_TYPE_ANNOTATION_BUTTON,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART_COUNT_ICON,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART_COUNT_LABEL,
        elementText: "Count",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventStatsEChartElements.CHART_COUNT_VALUE,
        elementText: countNumber,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART_COUNT_VALUE,
    });

    cy.verifyElement({
        element: eventStatsEChartElements.CHART_COUNT_TREND_ICON,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventStatsEChartElements.CHART_COUNT_PERCENTAGE,
        elementText: countPercantage,
    });
};

const verifyEventStatsDataTableElements = ({
    index = 0,
    isEmpty = false,
    date = null,
    count = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: eventStatsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: eventStatsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: eventStatsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventStatsDataTableElements(index).DATE,
        elementText: date,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: eventStatsDataTableElements(index).COUNT,
        elementText: count,
    });
};

const verifyCompareEventsEChartElements = ({
    isEmpty = false,
    eventName = 'Credit Card Application',
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: compareEventsEChartElements().EMPTY_CHART_ICON,
        });

        cy.verifyElement({
            labelElement: compareEventsEChartElements().EMPTY_CHART_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: compareEventsEChartElements().EMPTY_CHART_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: compareEventsEChartElements().SEGMENTATION_SELECT,
    });

    cy.verifyElement({
        element: compareEventsEChartElements().CHART,
    });

    cy.verifyElement({
        element: compareEventsEChartElements().CHART_TYPE_SELECT,
    });

    cy.verifyElement({
        element: compareEventsEChartElements().CHART_TYPE_ANNOTATION_BUTTON,
    });

    cy.verifyElement({
        element: compareEventsEChartElements().CHART_MORE_BUTTON,
    });

    cy.verifyElement({
        element: compareEventsEChartElements(eventName).CHART_EVENT_ICON,
        labelElement: compareEventsEChartElements(eventName).CHART_EVENT_LABEL,
        labelText: eventName,
    });

    cy.verifyElement({
        element: compareEventsEChartElements().CHART_PREVIOUS_PERIOD_ICON,
        labelElement: compareEventsEChartElements().CHART_PREVIOUS_PERIOD_LABEL,
        labelText: "Previous Period",
    });
};

const verifyCompareEventsDataTableElements = ({
    index = 0,
    isEmpty = false,
    eventName = null,
    count = null,
    sum = null,
    duration = null,
    avgDuration = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: compareEventsDataTableElements().EMPTY_DATATABLE_ICON,
        });

        cy.verifyElement({
            labelElement: compareEventsDataTableElements().EMPTY_DATATABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: compareEventsDataTableElements().EMPTY_DATATABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: compareEventsDataTableElements(index).EVENT,
        elementText: eventName,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements(index).COUNT,
        elementText: count,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements(index).SUM,
        elementText: sum,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements(index).DURATION,
        elementText: duration,
    });

    cy.verifyElement({
        element: compareEventsDataTableElements(index).AVG_DURATION,
        elementText: avgDuration,
    });
};

const selectEventsToCompare = (...events) => {
    cy.clickElement(eventsPageElements.SELECT_EVENTS_COMBOBOX);

    for (var i = 0; i < events.length; i++) {
        var itemSelector = 'el-option-test-id-' + helper.toSlug(events[i]) + '-el-options';
        //cy.typeInput(feedbackRatingWidgetsPageElements.SHOW_ONLY_SELECTOR_INPUT, events[i])
        cy.clickElement(itemSelector);
    }
    cy.clickBody();
};

const clickCompare = () => {
    cy.clickElement(eventsPageElements.COMPARE_BUTTON);
};

const clickEventStatsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(eventsPageElements.TAB_EVENT_STATS);
};

const clickCompareEventsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(eventsPageElements.TAB_COMPARE_EVENTS);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickEventStatsTab,
    clickCompareEventsTab,
    selectEventsToCompare,
    clickCompare,
    verifyEventStatsListBoxElements,
    verifyEventStatsEChartElements,
    verifyEventStatsDataTableElements,
    verifyCompareEventsEChartElements,
    verifyCompareEventsDataTableElements
};