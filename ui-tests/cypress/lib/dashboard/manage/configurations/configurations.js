import configurationsPageElements from "../../../../support/elements/dashboard/manage/configurations/configurations";

const verifyStaticElementsOfPage = () => {
    cy.verifyElement({
        labelElement: configurationsPageElements.PAGE_TITLE,
        labelText: "Settings",
    });
}

const verifyEmptyPageElements = () => {

    verifyStaticElementsOfPage();

};

module.exports = {
    verifyEmptyPageElements
};