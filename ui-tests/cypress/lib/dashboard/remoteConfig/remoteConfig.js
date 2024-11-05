import {
    remoteConfigElements,
    remoteConfigDataTableElements
} from "../../../support/elements/dashboard/remoteConfig/remoteConfig";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: remoteConfigElements.PAGE_TITLE,
        labelText: "Remote Config"
    });

    cy.verifyElement({
        element: remoteConfigElements.PAGE_TITLE_GUIDE_BUTTON,
    });

    cy.verifyElement({
        element: remoteConfigElements.ADD_PARAMETER_BUTTON,
        elementText: 'Add Parameter'
    });

    cy.verifyElement({
        element: remoteConfigDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: remoteConfigDataTableElements().DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: remoteConfigDataTableElements().COLUMN_NAME_PARAMETER_LABEL,
        labelText: "Parameter",
    });

    cy.verifyElement({
        element: remoteConfigDataTableElements().COLUMN_NAME_PARAMETER_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: remoteConfigDataTableElements().COLUMN_NAME_STATUS_LABEL,
        labelText: "Status",
    });

    cy.verifyElement({
        labelElement: remoteConfigDataTableElements().COLUMN_NAME_DESCRIPTION_LABEL,
        labelText: "Description",
    });

    cy.verifyElement({
        labelElement: remoteConfigDataTableElements().COLUMN_NAME_CREATED_LABEL,
        labelText: "Created",
    });

    cy.verifyElement({
        element: remoteConfigDataTableElements().COLUMN_NAME_CREATED_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: remoteConfigDataTableElements().COLUMN_NAME_AB_TESTING_STATUS_LABEL,
        labelText: "A/B Testing Status",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyRemoteConfigDataFromTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyRemoteConfigDataFromTable({
        isEmpty: false,
        shouldNotEqual: true,
    });
};

const verifyRemoteConfigDataFromTable = ({
    index = 0,
    isEmpty = false,
    shouldNotEqual = false,
    parameter = null,
    status = null,
    expireDate = null,
    description = null,
    createdDate = null,
    createdTime = null,
    abTestingStatus = null,
    //TODO : data test id coming as undefined, will fix it later
    //parameterValue = null, 
    //percentage = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: remoteConfigDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: remoteConfigDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: remoteConfigDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });
        return;
    }

    //TODO : data test id coming as undefined, will fix it later
    // cy.verifyElement({
    //     element: remoteConfigDataTableElements(index).EXPAND,
    // });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        labelElement: remoteConfigDataTableElements(index).PARAMETER,
        labelText: parameter,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        labelElement: remoteConfigDataTableElements(index).STATUS,
        labelText: status,
    });

    if (expireDate !== null) {
        cy.verifyElement({
            labelElement: remoteConfigDataTableElements(index).EXPIRATION_DATE,
            labelText: expireDate,
        });
    }

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        labelElement: remoteConfigDataTableElements(index).DESCRIPTION,
        labelText: description,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        labelElement: remoteConfigDataTableElements(index).CREATED_DATE,
        labelText: createdDate,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        labelElement: remoteConfigDataTableElements(index).CREATED_TIME,
        labelText: createdTime,
    });

    cy.verifyElement({
        shouldNot: shouldNotEqual,
        labelElement: remoteConfigDataTableElements(index).AB_TESTING_STATUS,
        labelText: abTestingStatus,
    });

    // TODO : data test id coming as undefined, will fix it later
    // cy.verifyElement({
    //     shouldNot: shouldNotEqual,
    //     labelElement: remoteConfigDataTableElements(index).PARAMETER_VALUE,
    //     labelText: parameterValue,
    // });

    // cy.verifyElement({
    //     shouldNot: shouldNotEqual,
    //     labelElement: remoteConfigDataTableElements(index).PERCENTAGE,
    //     labelText: percentage,
    // });
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyRemoteConfigDataFromTable
};