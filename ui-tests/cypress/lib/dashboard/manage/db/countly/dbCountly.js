import dbCountlyPageElements from "../../../../../support/elements/dashboard/manage/db/countly/dbCountly";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: dbCountlyPageElements.PAGE_TITLE,
        labelText: "DB Viewer",
        element: dbCountlyPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: dbCountlyPageElements.TAB_COUNTLY_DATABASE,
        elementText: "Countly Database"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.TAB_COUNTLY_OUT_DATABASE,
        elementText: "Countly Out Database"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.TAB_COUNTLY_FILE_SYSTEM_DATABASE,
        elementText: "Countly File System Database"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.COLLECTIONS_LISTBOX,
    });

    cy.verifyElement({
        element: dbCountlyPageElements.LISTBOX_APPLICATION_SELECT,
        elementPlaceHolder: "Select",
        value: "All Apps"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.LISTBOX_SEARCH_INPUT,
        elementPlaceHolder: "Search"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.COLLAPSE_OR_EXPAND_BUTTON,
        elementText: "Collapse All"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.FILTER_BUTTON,
        elementText: "Filter"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: dbCountlyPageElements.DATATABLE_SEARCH_BUTTON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        labelElement: dbCountlyPageElements.COLLECTION_AND_APP_NAME_LABEL,
        labelText: "app_crashes"
    });

    cy.verifyElement({
        element: dbCountlyPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: dbCountlyPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: dbCountlyPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const clickCountlyDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyPageElements.TAB_COUNTLY_DATABASE);
};

const clickCountlyOutDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyPageElements.TAB_COUNTLY_OUT_DATABASE);
};

const clickCountlyFileSystemDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyPageElements.TAB_COUNTLY_FILE_SYSTEM_DATABASE);
};

module.exports = {
    verifyEmptyPageElements,
    clickCountlyDatabaseTab,
    clickCountlyOutDatabaseTab,
    clickCountlyFileSystemDatabaseTab
};