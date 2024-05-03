import jobsPageElements from "../../../../support/elements/dashboard/manage/jobs/jobs";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: jobsPageElements.PAGE_TITLE,
        labelText: "Jobs"
    });

    cy.verifyElement({
        element: jobsPageElements.TABLE_JOBS,
    });

    cy.verifyElement({
        element: jobsPageElements.TABLE_EXPORT_BUTTON,
    });

    cy.verifyElement({
        element: jobsPageElements.TABLE_SEARCH_INPUT,
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();
    
};

module.exports = {
    verifyEmptyPageElements
};