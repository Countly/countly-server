import {
    consentHistoryPageElements,
    consentHistoryDataTableElements
} from "../../../../support/elements/dashboard/manage/compliance/history";


const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: consentHistoryPageElements.PAGE_TITLE,
        labelText: "Compliance Hub",
    });

    cy.verifyElement({
        labelElement: consentHistoryPageElements.CONSENT_HISTORY_FOR_LABEL,
        labelText: "Consent History for",
        element: consentHistoryPageElements.CONSENT_HISTORY_FILTER_SELECT,
        elementText: "All",
    });

    cy.verifyElement({
        labelElement: consentHistoryPageElements.CONSENT_HISTORY_AND_LABEL,
        labelText: "and",
        element: consentHistoryPageElements.CONSENT_HISTORY_METRICS_FILTER_SELECT,
        elementText: "All",
    });

    cy.verifyElement({
        element: consentHistoryDataTableElements().EXPORT_AS_BUTTON,
    });

    cy.verifyElement({
        element: consentHistoryDataTableElements().TABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        element: consentHistoryPageElements.TAB_METRICS,
        elementText: "Metrics",
    });

    cy.verifyElement({
        element: consentHistoryPageElements.TAB_USERS,
        elementText: "Users",
    });

    cy.verifyElement({
        element: consentHistoryPageElements.TAB_CONSENT_HISTORY,
        elementText: "Consent History",
    });

    cy.verifyElement({
        element: consentHistoryPageElements.TAB_EXPORT_PURGE_HISTORY,
        elementText: "Export/Purge History",
    });
};

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

    verifyConsentHistoryDataTableElements({
        isEmpty: true,
    });
};

const verifyFullDataPageElements = () => {

    verifyStaticElementsOfPage();

    verifyConsentHistoryDataTableElements({
        isEmpty: false,
    });
};

const verifyConsentHistoryDataTableElements = ({
    index = 0,
    isEmpty = false,
    id = null,
    uid = null,
    consentOptIn = null,
    consentOptOut = null,
    time = null,
    deviceId = null,
    optIn = null,
    optOut = null,
    device = null,
    appVersion = null,
}) => {

    if (isEmpty) {
        cy.verifyElement({
            element: consentHistoryDataTableElements().EMPTY_TABLE_ICON,
        });

        cy.verifyElement({
            labelElement: consentHistoryDataTableElements().EMPTY_TABLE_TITLE,
            labelText: "...hmm, seems empty here",
        });

        cy.verifyElement({
            labelElement: consentHistoryDataTableElements().EMPTY_TABLE_SUBTITLE,
            labelText: "No data found",
        });

        return;
    }

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: consentHistoryDataTableElements(index).ID,
        labelText: id,
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: consentHistoryDataTableElements(index).UID,
        labelText: uid,
    });

    cy
        .elementExists(consentHistoryDataTableElements(index).CHANGES_OPT_IN_LABEL)
        .then((isExists) => {
            if (isExists) {
                cy.verifyElement({
                    labelElement: consentHistoryDataTableElements(index).CHANGES_OPT_IN_LABEL,
                    labelText: "Opt in",
                });

                cy.verifyElement({
                    shouldNot: !isEmpty,
                    labelElement: consentHistoryDataTableElements(index).CONSENT_OPT_IN_LABEL,
                    labelText: consentOptIn,
                });
            }
        });

    cy
        .elementExists(consentHistoryDataTableElements(index).CHANGES_OPT_OUT_LABEL)
        .then((isExists) => {
            if (isExists) {
                cy.verifyElement({
                    labelElement: consentHistoryDataTableElements(index).CHANGES_OPT_OUT_LABEL,
                    labelText: "Opt out",
                });

                cy.verifyElement({
                    shouldNot: !isEmpty,
                    labelElement: consentHistoryDataTableElements(index).CONSENT_OPT_OUT_LABEL,
                    labelText: consentOptOut,
                });
            }
        });

    cy.verifyElement({
        shouldNot: !isEmpty,
        labelElement: consentHistoryDataTableElements(index).TIME,
        labelText: time,
    });

    cy.clickElement(consentHistoryDataTableElements(index).ID, true);

    cy.verifyElement({
        labelElement: consentHistoryDataTableElements(index).DEVICE_ID_LABEL,
        labelText: "Device ID",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentHistoryDataTableElements(index).DEVICE_ID,
        elementText: deviceId,
    });

    cy.verifyElement({
        labelElement: consentHistoryDataTableElements(index).OPT_IN_LABEL,
        labelText: "Opt in",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentHistoryDataTableElements(index).OPT_IN_LIST,
        elementText: optIn,
    });

    cy.verifyElement({
        labelElement: consentHistoryDataTableElements(index).OPT_OUT_LABEL,
        labelText: "Opt out",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentHistoryDataTableElements(index).OPT_OUT_LIST,
        elementText: optOut,
    });

    cy.verifyElement({
        labelElement: consentHistoryDataTableElements(index).DEVICE_LABEL,
        labelText: "Device",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentHistoryDataTableElements(index).DEVICE,
        elementText: device,
    });

    cy.verifyElement({
        labelElement: consentHistoryDataTableElements(index).APP_VERSION_LABEL,
        labelText: "App version",
    });

    cy.verifyElement({
        shouldNot: !isEmpty,
        element: consentHistoryDataTableElements(index).APP_VERSION,
        elementText: appVersion,
    });
};

const clickMetricsTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(consentHistoryPageElements.TAB_METRICS);
};

const clickUsersTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(consentHistoryPageElements.TAB_USERS);
};

const clickConsentHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(consentHistoryPageElements.TAB_CONSENT_HISTORY);
};

const clickExportPurgeHistoryTab = () => {
    cy.scrollPageToTop();
    cy.clickElement(consentHistoryPageElements.TAB_EXPORT_PURGE_HISTORY);
};

module.exports = {
    verifyEmptyPageElements,
    verifyFullDataPageElements,
    verifyConsentHistoryDataTableElements,
    clickMetricsTab,
    clickUsersTab,
    clickConsentHistoryTab,
    clickExportPurgeHistoryTab
};