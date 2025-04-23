import {
    pluginsPageElements,
    pluginsDataTableElements
} from "../../../../support/elements/dashboard/manage/plugins/plugins";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: pluginsPageElements.PAGE_TITLE,
        labelText: "Feature Management"
    });

    cy.verifyElement({
        element: pluginsPageElements.ALL_FEATURES_RADIO_BUTTON,
        elementText: 'All Features',
    });

    cy.verifyElement({
        element: pluginsPageElements.ENABLED_FEATURES_RADIO_BUTTON,
        elementText: 'Enabled',
    });

    cy.verifyElement({
        element: pluginsPageElements.DISABLED_FEATURES_RADIO_BUTTON,
        elementText: 'Disabled',
    });

    cy.verifyElement({
        element: pluginsDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: pluginsDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: pluginsDataTableElements().COLUMN_NAME_FEATURE_NAME_LABEL,
        labelText: "Feature name",
        element: pluginsDataTableElements().COLUMN_NAME_FEATURE_NAME_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: pluginsDataTableElements().COLUMN_NAME_DESCRIPTION_LABEL,
        labelText: "Description",
    });

    cy.verifyElement({
        labelElement: pluginsDataTableElements().COLUMN_NAME_DEPENDENT_FEATURES_LABEL,
        labelText: "Dependent Features",
    });
};

const verifyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyPluginsDataTable({
        index: 0,
        statusIsChecked: true,
        featureName: "Alerts",
        description: "Receive email alerts based on metric changes you configure",
        dependentFeatures: null
    });
};

const verifyPluginsDataTable = ({
    index = 0,
    statusIsChecked = true,
    featureName = null,
    description = null,
    dependentFeatures = null
}) => {

    cy.verifyElement({
        element: pluginsDataTableElements(index).STATUS,
        isChecked: statusIsChecked
    });

    cy.verifyElement({
        labelElement: pluginsDataTableElements(index).FEATURE_NAME,
        labelText: featureName,
    });

    cy.verifyElement({
        labelElement: pluginsDataTableElements(index).DESCRIPTION,
        labelText: description,
    });

    if (dependentFeatures !== null) {
        cy.verifyElement({
            labelElement: pluginsDataTableElements(index).DEPENDENT_FEATURES,
            labelText: dependentFeatures,
        });
    }
};

module.exports = {
    verifyPageElements,
    verifyPluginsDataTable
};