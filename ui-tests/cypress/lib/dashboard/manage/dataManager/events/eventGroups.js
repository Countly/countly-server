import dataManagerEventGroupsPageElements from "../../../../../support/elements/dashboard/manage/dataManager/events/eventGroups";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: dataManagerEventGroupsPageElements.PAGE_TITLE,
        labelText: "Manage Events",
    });

    cy.verifyElement({
        element: dataManagerEventGroupsPageElements.TAB_EVENTS,
        elementText: "Events",
    });

    cy.verifyElement({
        element: dataManagerEventGroupsPageElements.TAB_EVENT_GROUPS,
        elementText: "Event Groups",
    });

 
    cy.verifyElement({
        element: dataManagerEventGroupsPageElements.EVENT_GROUP_SELECT,
    });

    cy.verifyElement({
        element: dataManagerEventGroupsPageElements.EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: dataManagerEventGroupsPageElements.DATATABLE_SEARCH_INPUT,
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: dataManagerEventGroupsPageElements.EMPTY_DATATABLE_ICON,
    });

    cy.verifyElement({
        labelElement: dataManagerEventGroupsPageElements.EMPTY_DATATABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: dataManagerEventGroupsPageElements.EMPTY_DATATABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickEventsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dataManagerEventGroupsPageElements.TAB_EVENTS);
};

const clickEventGroupsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dataManagerEventGroupsPageElements.TAB_EVENT_GROUPS);
};

module.exports = {
    verifyEmptyPageElements,
    clickEventsTab,
    clickEventGroupsTab
};