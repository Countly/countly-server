import managePopulatePageElements from "../../../../support/elements/dashboard/manage/populate/populate";

const verifyStaticElementsOfDataPopulatorPage = () => {
    cy.verifyElement({
        labelElement: managePopulatePageElements.DATA_POPULATOR_PAGE_TITLE,
        labelText: "Data Populator",
        tooltipElement: managePopulatePageElements.DATA_POPULATOR_PAGE_TITLE_TOOLTIP,
        tooltipText: "Populate a Countly app with random data (typically for testing or demonstration)"
    });

    cy.verifyElement({
        element: managePopulatePageElements.TAB_DATA_POPULATOR,
        elementText: "Data Populator",
    });

    cy.verifyElement({
        element: managePopulatePageElements.TAB_TEMPLATES,
        elementText: "Templates",
    });

    cy.verifyElement({
        element: managePopulatePageElements.TAB_POPULATE_WITH_TEMPLATE,
        elementText: "Populate with Template",

    });

    cy.verifyElement({
        element: managePopulatePageElements.TAB_POPULATE_WITH_ENVIRONMENT,
        elementText: "Populate with Environment",
    });
};

const verifyEmptyPageElementsOfDataPopulatorWithTemplatePage = () => {

    verifyStaticElementsOfDataPopulatorPage();

    cy.verifyElement({
        labelElement: managePopulatePageElements.TEMPLATE_DATA_TEMPLATE_LABEL,
        labelText: "Data template",
        tooltipElement: managePopulatePageElements.TEMPLATE_DATA_TEMPLATE_TOOLTIP,
        tooltipText: "Choose a template for data population. If you can't find a suitable template, you can create a new one from the “Templates” tab above."
    });

    cy.verifyElement({
        element: managePopulatePageElements.TEMPLATE_DATA_TEMPLATE_SELECT,
        elementPlaceHolder: "Select a template",
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.TEMPLATE_DATE_RANGE_LABEL,
        labelText: "Date range",
    });

    cy.verifyElement({
        element: managePopulatePageElements.TEMPLATE_DATE_RANGE_SELECT,
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_LABEL,
        labelText: "Number of runs",
        tooltipElement: managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_TOOLTIP,
        tooltipText: "Each run will go through each unique user in the environment/template and will trigger one sequence per user"
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_10_LABEL,
        labelText: "10"
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_50_LABEL,
        labelText: "50"
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_100_LABEL,
        labelText: "100"
    });

    cy.verifyElement({
        element: managePopulatePageElements.TEMPLATE_SAVE_ENVIRONMENT_SWITCHBOX,
        labelElement: managePopulatePageElements.TEMPLATE_SAVE_ENVIRONMENT_LABEL,
        labelText: "Save environment",
        tooltipElement: managePopulatePageElements.TEMPLATE_SAVE_ENVIRONMENT_TOOLTIP,
        tooltipText: "Choose an environment for data population. If no environments are available, initiate the populator with a template first and then save to create an environment. Environments enable you to execute the populator with a consistent user set, ensuring uniform data across multiple runs."
    });

    cy.verifyElement({
        element: managePopulatePageElements.TEMPLATE_SAVE_ENVIRONMENT_INPUT,
        elementPlaceHolder: "Enter an environment name",
    });

    cy.verifyElement({
        element: managePopulatePageElements.TEMPLATE_GENERATE_DEMO_DATA_BUTTON,
        elementText: "Generate Demo Data",
    });
};

const verifyEmptyPageElementsOfDataPopulatorWithEnvironmentPage = () => {

    verifyStaticElementsOfDataPopulatorPage();

    cy.verifyElement({
        labelElement: managePopulatePageElements.ENVIRONMENT_LABEL,
        labelText: "Environment",
        tooltipElement: managePopulatePageElements.ENVIRONMENT_TOOLTIP,
        tooltipText: "Choose an environment for data population. If no environments are available, initiate the populator with a template first and then save to create an environment. Environments enable you to execute the populator with a consistent user set, ensuring uniform data across multiple runs."
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.ENVIRONMENT_DATE_RANGE_LABEL,
        labelText: "Date range",
    });

    cy.verifyElement({
        element: managePopulatePageElements.ENVIRONMENT_DATE_RANGE_SELECT,
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.ENVIRONMENT_NUMBER_OF_RUNS_LABEL,
        labelText: "Number of runs",
        tooltipElement: managePopulatePageElements.ENVIRONMENT_NUMBER_OF_RUNS_TOOLTIP,
        tooltipText: "Each run will go through each unique user in the environment/template and will trigger one sequence per user"
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.ENVIRONMENT_NUMBER_OF_RUNS_10_LABEL,
        labelText: "10"
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.ENVIRONMENT_NUMBER_OF_RUNS_50_LABEL,
        labelText: "50"
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.ENVIRONMENT_NUMBER_OF_RUNS_100_LABEL,
        labelText: "100"
    });

    cy.verifyElement({
        element: managePopulatePageElements.ENVIRONMENT_GENERATE_DEMO_DATA_BUTTON,
        elementText: "Generate Demo Data",
    });
};

const verifyEmptyPageElementsOfTemplatesPage = () => {

    cy.verifyElement({
        element: managePopulatePageElements.TAB_DATA_POPULATOR,
        elementText: "Data Populator",
    });

    cy.verifyElement({
        element: managePopulatePageElements.TAB_TEMPLATES,
        elementText: "Templates",
    });

    cy.verifyElement({
        labelElement: managePopulatePageElements.TEMPLATES_PAGE_TITLE,
        labelText: "Templates",
        tooltipElement: managePopulatePageElements.TEMPLATES_PAGE_TITLE_TOOLTIP,
        tooltipText: "Manage your templates for data population"
    });

    cy.verifyElement({
        element: managePopulatePageElements.CREATE_NEW_TEMPLATE_BUTTON,
        elementText: "Create New Template",
    });

    cy.verifyElement({
        element: managePopulatePageElements.TEMPLATES_DATATABLE
    });
};

const selectDataTemplate = (template) => {
    var elementItemSelector = 'el-option-test-id-' + template + '-el-options';
    cy.clickElement(managePopulatePageElements.TEMPLATE_DATA_TEMPLATE_SELECT);
    cy.clickElement(elementItemSelector);
};

const selectDateRange = (startDate, endDate) => {
    cy.clickElement(managePopulatePageElements.TEMPLATE_DATE_RANGE_SELECT);
    cy.typeInput(managePopulatePageElements.TEMPLATE_DATE_RANGE_START_DATE, startDate);
    cy.typeInput(managePopulatePageElements.TEMPLATE_DATE_RANGE_END_DATE, endDate);
    cy.clickElement(managePopulatePageElements.TEMPLATE_DATE_RANGE_APPLY_BUTTON);
};

const clickNumberOfRunsAs10 = () => {
    cy.clickElement(managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_10_LABEL);
};

const clickNumberOfRunsAs50 = () => {
    cy.clickElement(managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_50_LABEL);
};

const clickNumberOfRunsAs100 = () => {
    cy.clickElement(managePopulatePageElements.TEMPLATE_NUMBER_OF_RUNS_100_LABEL);
};

const clickGenerateDemoDataButton = () => {
    cy.clickElement(managePopulatePageElements.TEMPLATE_GENERATE_DEMO_DATA_BUTTON);
};

const clickYesPopulateDataButton = () => {
    cy.clickElement(managePopulatePageElements.CONFIRM_POP_UP_SAVE_BUTTON);
};

const clickNavigateToHomeButton = () => {
    cy.clickElement(managePopulatePageElements.SUCCESS_POP_UP_GO_TO_HOME_BUTTON);
};

const clickDataPopulatorTab = () => {
    cy.clickElement(managePopulatePageElements.TAB_DATA_POPULATOR);
};

const clickTemplatesTab = () => {
    cy.clickElement(managePopulatePageElements.TAB_TEMPLATES);
};

const clickPopulateWithTemplateTab = () => {
    cy.clickElement(managePopulatePageElements.TAB_POPULATE_WITH_TEMPLATE);
};

const clickPopulateWithEnvironmentTab = () => {
    cy.clickElement(managePopulatePageElements.TAB_POPULATE_WITH_ENVIRONMENT);
};

const generateData = ({
    template = 'bank',
    startDate,
    endDate,
    numberOfRuns
}) => {
    selectDataTemplate(template);

    if (startDate != null && endDate != null) {
        selectDateRange(startDate, endDate);
    }

    if (numberOfRuns === '100') {
        clickNumberOfRunsAs100();
    }
    else if (numberOfRuns === '50') {
        clickNumberOfRunsAs50();
    } else {
        clickNumberOfRunsAs10();
    }

    clickGenerateDemoDataButton();
    clickYesPopulateDataButton();

    cy
        .elementExists(managePopulatePageElements.GENERATING_POP_UP_PROGRESS_BAR)
        .then((isExists) => {
            if (isExists) {
                cy.shouldNotExist(managePopulatePageElements.GENERATING_POP_UP_PROGRESS_BAR);
            }
        });

    clickNavigateToHomeButton();
};

module.exports = {
    clickDataPopulatorTab,
    clickTemplatesTab,
    clickPopulateWithTemplateTab,
    clickPopulateWithEnvironmentTab,
    verifyEmptyPageElementsOfDataPopulatorWithTemplatePage,
    verifyEmptyPageElementsOfDataPopulatorWithEnvironmentPage,
    verifyEmptyPageElementsOfTemplatesPage,
    selectDataTemplate,
    selectDateRange,
    clickNumberOfRunsAs10,
    clickNumberOfRunsAs50,
    clickNumberOfRunsAs100,
    clickGenerateDemoDataButton,
    clickYesPopulateDataButton,
    clickNavigateToHomeButton,
    generateData
};