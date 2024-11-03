import dbCountlyFsPageElements from "../../../../../support/elements/dashboard/manage/db/countlyFs/countlyFs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: dbCountlyFsPageElements.PAGE_TITLE,
        labelText: "DB Viewer",
        element: dbCountlyFsPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.TAB_COUNTLY_DATABASE,
        elementText: "Countly Database"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.TAB_COUNTLY_OUT_DATABASE,
        elementText: "Countly Out Database"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.TAB_COUNTLY_FILE_SYSTEM_DATABASE,
        elementText: "Countly File System Database"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.LISTBOX_APPLICATION_SELECT,
        elementPlaceHolder: "Select",
        value: "All Apps"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.LISTBOX_SEARCH_INPUT,
        elementPlaceHolder: "Search"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.COLLAPSE_OR_EXPAND_BUTTON,
        elementText: "Collapse All"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.FILTER_BUTTON,
        elementText: "Filter"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.DATATABLE_SEARCH_BUTTON,
    });
};

const verifyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: dbCountlyFsPageElements.COLLECTIONS_LISTBOX_NO_DATA,
        elementText: "No match found"
    });

    cy.verifyElement({
        element: dbCountlyFsPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: dbCountlyFsPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: dbCountlyFsPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickCountlyDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyFsPageElements.TAB_COUNTLY_DATABASE);
};

const clickCountlyOutDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyFsPageElements.TAB_COUNTLY_OUT_DATABASE);
};

const clickCountlyFileSystemDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyFsPageElements.TAB_COUNTLY_FILE_SYSTEM_DATABASE);
};

module.exports = {
    verifyPageElements,
    clickCountlyDatabaseTab,
    clickCountlyOutDatabaseTab,
    clickCountlyFileSystemDatabaseTab
};