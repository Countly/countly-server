import pluginsPageElements from "../../../../support/elements/dashboard/manage/plugins/plugins";

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
        element: pluginsPageElements.TABLE_PLUGINS,
    });

    cy.verifyElement({
        element: pluginsPageElements.TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: pluginsPageElements.TABLE_SEARCH_INPUT,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

};

module.exports = {
    verifyEmptyPageElements
};