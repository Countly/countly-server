import {
    eventsGroupsPageElements,
    eventsGroupsDataTableElements
} from "../../../../../support/elements/dashboard/manage/dataManager/events/eventGroups";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: eventsGroupsPageElements.PAGE_TITLE,
        labelText: "Manage Events",
    });

    cy.verifyElement({
        element: eventsGroupsPageElements.TAB_EVENTS,
        elementText: "Events",
    });

    cy.verifyElement({
        element: eventsGroupsPageElements.TAB_EVENT_GROUPS,
        elementText: "Event Groups",
    });

    // cy.verifyElement({ //TODO: data test id is missing
    //     element: eventsGroupsDataTableElements().SELECT_ALL_EVENTS_CHECKBOX,
    // });

    cy.verifyElement({
        element: eventsGroupsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: eventsGroupsDataTableElements().DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        isElementVisible: false,
        labelElement: eventsGroupsDataTableElements().COLUMN_NAME_EVENT_GROUP_NAME_LABEL,
        labelText: "Event Group Name",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: eventsGroupsDataTableElements().COLUMN_NAME_EVENT_GROUP_NAME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: eventsGroupsDataTableElements().COLUMN_NAME_EVENT_GROUP_DESCRIPTION_LABEL,
        labelText: "Event Group Description",
    });

    cy.verifyElement({
        element: eventsGroupsDataTableElements().COLUMN_NAME_EVENT_GROUP_DESCRIPTION_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyEventGroupsDataTableElements({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyEventGroupsDataTableElements({
        isEmpty: false,
        shouldNotEqual: true,
    });
};

const verifyEventGroupsDataTableElements = ({
    index = 0,
    isEmpty = false,
    shouldNotEqual = false,
    eventGroupName = null,
    eventGroupDescription = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: eventsGroupsDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: eventsGroupsDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: eventsGroupsDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    // cy.verifyElement({ //TODO: data test id is missing
    //     element: eventsGroupsDataTableElements(index).SELECT_EVENT_GROUP_CHECKBOX,
    // });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsGroupsDataTableElements(index).EVENT_GROUP_NAME,
        elementText: eventGroupName,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        element: eventsGroupsDataTableElements(index).EVENT_GROUP_DESCRIPTION,
        elementText: eventGroupDescription,
    });
};

const clickEventsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(eventsGroupsPageElements.TAB_EVENTS);
};

const clickEventGroupsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(eventsGroupsPageElements.TAB_EVENT_GROUPS);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickEventsTab,
    clickEventGroupsTab,
    verifyEventGroupsDataTableElements
};