import hooksPageElements from "../../../../support/elements/dashboard/manage/hooks/hooks";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: hooksPageElements.PAGE_TITLE,
        labelText: "Hooks",
        element: hooksPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: hooksPageElements.NEW_HOOK_BUTTON,
        elementText:'New hook',
    });

    cy.verifyElement({
        element: hooksPageElements.TABLE_HOOKS,
    });

    cy.verifyElement({
        element: hooksPageElements.ALL_HOOKS_RADIO_BUTTON,
        elementText:'All Hooks',
    });

    cy.verifyElement({
        element: hooksPageElements.ENABLED_HOOKS_RADIO_BUTTON,
        elementText: 'Enabled',
    });

    cy.verifyElement({
        element: hooksPageElements.DISABLED_HOOKS_RADIO_BUTTON,
        elementText: 'Disabled',
    });

    cy.verifyElement({
        element: hooksPageElements.APPLICATION_SELECT_BOX,
        elementPlaceHolder: "All Applications",
    });

    cy.verifyElement({
        element: hooksPageElements.TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: hooksPageElements.TABLE_SEARCH_INPUT,
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    cy.verifyElement({
        element: hooksPageElements.EMPTY_TABLE_ICON,
    });

    cy.verifyElement({
        labelElement: hooksPageElements.EMPTY_TABLE_TITLE,
        labelText: "...hmm, seems empty here",
    });

    cy.verifyElement({
        labelElement: hooksPageElements.EMPTY_TABLE_SUBTITLE,
        labelText: "No data found",
    });
};

module.exports = {
    verifyEmptyPageElements
};