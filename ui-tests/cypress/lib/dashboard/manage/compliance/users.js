import {
    usersPageElements,
    usersDataTableElements
} from "../../../../support/elements/dashboard/manage/compliance/users";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: usersPageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        element: usersPageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: usersPageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: usersPageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: usersPageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });

    cy.verifyElement({
        element: usersDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: usersDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        isElementVisible: false,
        labelElement: usersDataTableElements().COLUMN_NAME_ID_LABEL,
        labelText: "ID",
    });

    cy.verifyElement({
        isElementVisible: false,
        element: usersDataTableElements().COLUMN_NAME_ID_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_DEVICE_LABEL,
        labelText: "DEVICE",
    });

    cy.verifyElement({
        element: usersDataTableElements().COLUMN_NAME_DEVICE_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_APP_VERSION_LABEL,
        labelText: "APP VERSION",
    });

    cy.verifyElement({
        element: usersDataTableElements().COLUMN_NAME_APP_VERSION_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_CONSENT_LABEL,
        labelText: "consent",
    });

    cy.verifyElement({
        labelElement: usersDataTableElements().COLUMN_NAME_TIME_LABEL,
        labelText: "TIME",
    });

    cy.verifyElement({
        element: usersDataTableElements().COLUMN_NAME_TIME_SORTABLE_ICON,
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyUsersDataFromTable({
        isEmpty: true
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyUsersDataFromTable({
        isEmpty: false,
    });
};

const verifyUsersDataFromTable = ({
    index = 0,
    isEmpty = false,
    id = null,
    device = null,
    appVersion = null,
    optIn = null,
    optOut = null,
    time = null
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: usersDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: usersDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: usersDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: usersDataTableElements(index).ID,
        labelText: id,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: usersDataTableElements(index).DEVICE,
        labelText: device,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: usersDataTableElements(index).APP_VERSION,
        labelText: appVersion,
    });

    cy
        .elementExists(usersDataTableElements(index).CONSENT_OPT_IN_LABEL)
        .then((isExists) => {
            if (isExists) {
                cy.verifyElement({
                    labelElement: usersDataTableElements(index).CONSENT_OPT_IN_LABEL,
                    labelText: "Opt in",
                });

                cy
                    .elementExists(usersDataTableElements(index).CONSENT_OPT_IN_LIST)
                    .then((isExists) => {
                        if (isExists) {
                            cy.verifyElement({
                                shouldNot: !isEmpty,
                                labelElement: usersDataTableElements(index).CONSENT_OPT_IN_LIST,
                                labelText: optIn,
                            });
                        }
                    });

                cy.verifyElement({
                    labelElement: usersDataTableElements(index).CONSENT_OPT_OUT_LABEL,
                    labelText: "Opt out",
                });

                cy
                    .elementExists(usersDataTableElements(index).CONSENT_OPT_OUT_LIST)
                    .then((isExists) => {
                        if (isExists) {
                            cy.verifyElement({
                                shouldNot: !isEmpty,
                                labelElement: usersDataTableElements(index).CONSENT_OPT_OUT_LIST,
                                labelText: optOut,
                            });
                        }
                    });
            }
            else {
                cy.verifyElement({
                    labelElement: usersDataTableElements(index).CONSENT,
                    labelText: "-",
                });
            }
        });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: usersDataTableElements(index).TIME,
        labelText: time,
    });
};

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(usersPageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(usersPageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(usersPageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(usersPageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};