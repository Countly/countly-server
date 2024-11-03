import dbCountlyOutPageElements from "../../../../../support/elements/dashboard/manage/db/countlyOut/countlyOut";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: dbCountlyOutPageElements.PAGE_TITLE,
        labelText: "DB Viewer",
        element: dbCountlyOutPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.TAB_COUNTLY_DATABASE,
        elementText: "Countly Database"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.TAB_COUNTLY_OUT_DATABASE,
        elementText: "Countly Out Database"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.TAB_COUNTLY_FILE_SYSTEM_DATABASE,
        elementText: "Countly File System Database"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.LISTBOX_APPLICATION_SELECT,
        elementPlaceHolder: "Select",
        value: "All Apps"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.LISTBOX_SEARCH_INPUT,
        elementPlaceHolder: "Search"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.COLLAPSE_OR_EXPAND_BUTTON,
        elementText: "Collapse All"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.FILTER_BUTTON,
        elementText: "Filter"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.DATATABLE_SEARCH_BUTTON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: dbCountlyOutPageElements.COLLECTIONS_LISTBOX_NO_DATA,
        elementText: "No match found"
    });

    cy.verifyElement({
        element: dbCountlyOutPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: dbCountlyOutPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: dbCountlyOutPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    cy.shouldNotExist(dbCountlyOutPageElements.EMPTY_TABLE_ICON);
};

const clickCountlyDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyOutPageElements.TAB_COUNTLY_DATABASE);
};

const clickCountlyOutDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyOutPageElements.TAB_COUNTLY_OUT_DATABASE);
};

const clickCountlyFileSystemDatabaseTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(dbCountlyOutPageElements.TAB_COUNTLY_FILE_SYSTEM_DATABASE);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickCountlyDatabaseTab,
    clickCountlyOutDatabaseTab,
    clickCountlyFileSystemDatabaseTab
};