import {
    hooksPageElements,
    hooksDataTableElements
} from "../../../../support/elements/dashboard/manage/hooks/hooks";

const verifyStaticElementsOfPage = () => {

    cy.verifyElement({
        labelElement: hooksPageElements.PAGE_TITLE,
        labelText: "Hooks",
        element: hooksPageElements.PAGE_TITLE_VIEW_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: hooksPageElements.NEW_HOOK_BUTTON,
        elementText: 'New hook',
    });

    cy.verifyElement({
        element: hooksPageElements.ALL_HOOKS_RADIO_BUTTON,
        elementText: 'All Hooks',
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
        element: hooksDataTableElements().EDIT_COLOMNS_BUTTON,
    });

    cy.verifyElement({
        element: hooksDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: hooksDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        isElementVisible: false,
        labelElement: hooksDataTableElements().COLUMN_NAME_HOOK_NAME_LABEL,
        labelText: "Hook name",
        element: hooksDataTableElements().COLUMN_NAME_FEATURE_NAME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: hooksDataTableElements().COLUMN_NAME_TRIGGER_ACTIONS_LABEL,
        labelText: "Trigger  Actions",
    });

    cy.verifyElement({
        labelElement: hooksDataTableElements().COLUMN_NAME_TRIGGER_COUNT_LABEL,
        labelText: "Trigger Count",
        element: hooksDataTableElements().COLUMN_NAME_TRIGGER_COUNT_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: hooksDataTableElements().COLUMN_NAME_LAST_TRIGGERED_LABEL,
        labelText: "Last Triggered",
        element: hooksDataTableElements().COLUMN_NAME_LAST_TRIGGERED_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: hooksDataTableElements().COLUMN_NAME_CREATE_BY_LABEL,
        labelText: "Create by",
        element: hooksDataTableElements().COLUMN_NAME_CREATE_BY_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {
    
    verifyStaticElementsOfPage();

    verifyHooksDataTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyHooksDataTable({
        isEmpty: false,
    });
};

const verifyHooksDataTable = ({
    index = 0,
    isEmpty = false,
    isStatusChecked = false,
    hookName = null,
    hookDescription = null,
    triggerActions = null,
    triggerCount = null,
    lastTriggered = null,
    createdBy = null,
    createdDate = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: hooksDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: hooksDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: hooksDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        element: hooksDataTableElements(index).STATUS,
        isChecked: isStatusChecked,
    });

    cy.verifyElement({
        element: hooksDataTableElements(index).HOOK_NAME,
        elementText: hookName,
    });

    cy.verifyElement({
        element: hooksDataTableElements(index).HOOK_DESCRIPTION,
        elementText: hookDescription,
    });

    cy.verifyElement({
        element: hooksDataTableElements(index).TRIGGER_ACTIONS,
        elementText: triggerActions,
    });

    cy.verifyElement({
        element: hooksDataTableElements(index).TRIGGER_COUNT,
        elementText: triggerCount,
    });

    cy.verifyElement({
        element: hooksDataTableElements(index).LAST_TRIGGERED,
        elementText: lastTriggered,
    });

    cy.verifyElement({
        element: hooksDataTableElements(index).CREATE_BY,
        elementText: createdBy,
    });

    cy.verifyElement({
        element: hooksDataTableElements(index).CREATE_DATE,
        elementText: createdDate,
    });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyHooksDataTable
};
