import dataManagerEventsPageElements from "../../../../../support/elements/dashboard/manage/dataManager/events/events";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: dataManagerEventsPageElements.PAGE_TITLE,
        labelText: "Manage Events",
    });

    cy.verifyElement({
        element: dataManagerEventsPageElements.TAB_EVENTS,
        elementText: "Events",
    });

    cy.verifyElement({
        element: dataManagerEventsPageElements.TAB_EVENT_GROUPS,
        elementText: "Event Groups",
    });


    cy.verifyElement({
        element: dataManagerEventsPageElements.FILTER_PARAMETERS_SELECT,
    });

    cy.verifyElement({
        element: dataManagerEventsPageElements.EDIT_COLUMNS_BUTTON,
    });

    cy.verifyElement({
        element: dataManagerEventsPageElements.EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: dataManagerEventsPageElements.DATATABLE_SEARCH_INPUT,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: dataManagerEventsPageElements.EMPTY_DATATABLE_ICON,
    });

    cy.verifyElement({
        labelElement: dataManagerEventsPageElements.EMPTY_DATATABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: dataManagerEventsPageElements.EMPTY_DATATABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickEventsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dataManagerEventsPageElements.TAB_EVENTS);
};

const clickEventGroupsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dataManagerEventsPageElements.TAB_EVENT_GROUPS);
};

module.exports = {
    verifyEmptyPageElements,
    clickEventsTab,
    clickEventGroupsTab
};