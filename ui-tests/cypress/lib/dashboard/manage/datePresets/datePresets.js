import {
    datePresetsElements,
    datePresetsTableElements
} from "../../../../support/elements/dashboard/manage/datePresets/datePresets";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: datePresetsElements.PAGE_TITLE,
        labelText: "Date presets",
    });

    cy.verifyElement({
        element: datePresetsElements.CREATE_DATE_PRESET_BUTTON,
        elementText: "New date preset",
    });

    cy.verifyElement({
        labelElement: datePresetsTableElements().COLUMN_NAME_NAME_LABEL,
        labelText: "Name",
    });

    cy.verifyElement({
        labelElement: datePresetsTableElements().COLUMN_NAME_DATE_RANGE_LABEL,
        labelText: "Date range",
    });

    cy.verifyElement({
        labelElement: datePresetsTableElements().COLUMN_NAME_OWNERT_LABEL,
        labelText: "Owner",
    });

    cy.verifyElement({
        labelElement: datePresetsTableElements().COLUMN_NAME_VISIBILITY_LABEL,
        labelText: "Visibility",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyDatePresetsDataFromTable({
        isEmpty: true,
    })
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyDatePresetsDataFromTable({
        isEmpty: false,
    });
};


const verifyDatePresetsDataFromTable = ({
    isEmpty = false,
    index = 0,
    name = null,
    dateRange = null,
    owner = null,
    visibility = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: datePresetsTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: datePresetsTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: datePresetsTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: datePresetsTableElements(index).NAME,
        elementText: name,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: datePresetsTableElements(index).DATE_RANGE,
        elementText: dateRange,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: datePresetsTableElements(index).OWNER,
        elementText: owner,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: datePresetsTableElements(index).VISIBILITY,
        elementText: visibility,
    });

    cy.verifyElement({
        element: datePresetsTableElements(index).MORE_BUTTON,
    });
}

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyDatePresetsDataFromTable
};