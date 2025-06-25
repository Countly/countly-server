import {
    eventsPageElements,
    eventsDataTableElements
} from "../../../../../support/elements/dashboard/manage/dataManager/events/events";

const verifyStaticElementsOfPage = () => {


    cy.verifyElement({
        element: eventsPageElements.TAB_EVENTS,
        elementText: "Events",
    });

    cy.verifyElement({
        element: eventsPageElements.TAB_EVENT_GROUPS,
        elementText: "Event Groups",
    });

    cy.verifyElement({
        element: eventsPageElements.FILTER_PARAMETERS_SELECT,
    });

    cy.verifyElement({
        element: eventsDataTableElements().EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: eventsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: eventsDataTableElements().DATATABLE_SEARCH_INPUT,
    });

    // cy.verifyElement({   //TODO: data test id is missing
    //     element: eventsDataTableElements().SELECT_ALL_EVENTS_CHECKBOX,
    // });

    cy.verifyElement({
        isElementVisible: false,
        labelElement: eventsDataTableElements().COLUMN_NAME_EVENT_NAME_LABEL,
        labelText: "Event Name",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: eventsDataTableElements().COLUMN_NAME_EVENT_NAME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: eventsDataTableElements().COLUMN_NAME_DESCRIPTION_LABEL,
        labelText: "Description",
    });

    cy.verifyElement({
        element: eventsDataTableElements().COLUMN_NAME_DESCRIPTION_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: eventsDataTableElements().COLUMN_NAME_CATEGORY_LABEL,
        labelText: "Category",
    });

    cy.verifyElement({
        element: eventsDataTableElements().COLUMN_NAME_CATEGORY_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: eventsDataTableElements().COLUMN_NAME_COUNT_LABEL,
        labelText: "Count",
    });

    cy.verifyElement({
        element: eventsDataTableElements().COLUMN_NAME_COUNT_SORTABLE_ICON,
    });

    cy.verifyElement({
        isElementVisible: false,
        labelElement: eventsDataTableElements().COLUMN_NAME_LAST_MODIFIED_LABEL,
        labelText: "Last Modified",
    });

    cy.verifyElement({
        element: eventsDataTableElements().COLUMN_NAME_LAST_MODIFIED_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyEventsDataTableElements({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyEventsDataTableElements({
        isEmpty: false,
        shouldNotEqual: true,
    });
};

const verifyEventsDataTableElements = ({
    isEmpty = false,
    shouldNotEqual = false,
    index = 0,
    nameAndDescription = null,
    data = null,
    status = null,
    origin = null,
    lastUpdated = null,
    duration = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: eventsDataTableElements(index).EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: eventsDataTableElements(index).EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: eventsDataTableElements(index).EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsDataTableElements(index).NAME_AND_DESCRIPTION,
        elementText: nameAndDescription,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsDataTableElements(index).DATA,
        elementText: data,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsDataTableElements(index).STATUS,
        elementText: status,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsDataTableElements(index).ORIGIN,
        elementText: origin,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsDataTableElements(index).LAST_UPDATED,
        elementText: lastUpdated,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsDataTableElements(index).DURATION,
        elementText: duration,
    });
};

const clickEventsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(eventsPageElements.TAB_EVENTS);
};

const clickEventGroupsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(eventsPageElements.TAB_EVENT_GROUPS);
};

module.exports = {
    verifyEmptyPageElements,
    verifyEventsDataTableElements,
    verifyFullDataPageElements,
    clickEventsTab,
    clickEventGroupsTab
};
