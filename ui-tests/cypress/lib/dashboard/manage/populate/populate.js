import {
    dataPopulatorPageElements,
    populateWithTemplatePageElements,
    populateWithEnvironmentPageElements,
    popUpElements,
    templatesPageElements,
    templatesDataTableElements
} from "../../../../support/elements/dashboard/manage/populate/populate";

const verifyStaticElementsOfDataPopulatorPage = () => {
    cy.verifyElement({
        labelElement: populateWithTemplatePageElements.DATA_POPULATOR_PAGE_TITLE,
        labelText: "Data Populator",
        tooltipElement: populateWithTemplatePageElements.DATA_POPULATOR_PAGE_TITLE_TOOLTIP,
        tooltipText: "Populate a Countly app with random data (typically for testing or demonstration)"
    });

    cy.verifyElement({
        element: dataPopulatorPageElements.TAB_DATA_POPULATOR,
        elementText: "Data Populator",
    });

    cy.verifyElement({
        element: dataPopulatorPageElements.TAB_TEMPLATES,
        elementText: "Templates",
    });

    cy.verifyElement({
        element: dataPopulatorPageElements.TAB_POPULATE_WITH_TEMPLATE,
        elementText: "Populate with Template",

    });

    cy.verifyElement({
        element: dataPopulatorPageElements.TAB_POPULATE_WITH_ENVIRONMENT,
        elementText: "Populate with Environment",
    });
};

const verifyPageElementsOfDataPopulatorWithTemplatePage = () => {

    verifyStaticElementsOfDataPopulatorPage();

    cy.verifyElement({
        labelElement: populateWithTemplatePageElements.TEMPLATE_DATA_TEMPLATE_LABEL,
        labelText: "Data template",
        tooltipElement: populateWithTemplatePageElements.TEMPLATE_DATA_TEMPLATE_TOOLTIP,
        tooltipText: "Choose a template for data population. If you can't find a suitable template, you can create a new one from the “Templates” tab above."
    });

    cy.verifyElement({
        element: populateWithTemplatePageElements.TEMPLATE_DATA_TEMPLATE_SELECT,
        elementPlaceHolder: "Select a template",
    });

    cy.verifyElement({
        labelElement: populateWithTemplatePageElements.TEMPLATE_DATE_RANGE_LABEL,
        labelText: "Date range",
    });

    cy.verifyElement({
        element: populateWithTemplatePageElements.TEMPLATE_DATE_RANGE_SELECT,
    });

    cy.verifyElement({
        labelElement: populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_LABEL,
        labelText: "Number of runs",
        tooltipElement: populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_TOOLTIP,
        tooltipText: "Each run will go through each unique user in the environment/template and will trigger one sequence per user"
    });

    cy.verifyElement({
        labelElement: populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_10_LABEL,
        labelText: "10"
    });

    cy.verifyElement({
        labelElement: populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_50_LABEL,
        labelText: "50"
    });

    cy.verifyElement({
        labelElement: populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_100_LABEL,
        labelText: "100"
    });

    cy.verifyElement({
        element: populateWithTemplatePageElements.TEMPLATE_SAVE_ENVIRONMENT_SWITCHBOX,
        labelElement: populateWithTemplatePageElements.TEMPLATE_SAVE_ENVIRONMENT_LABEL,
        labelText: "Save environment",
        tooltipElement: populateWithTemplatePageElements.TEMPLATE_SAVE_ENVIRONMENT_TOOLTIP,
        tooltipText: "Choose an environment for data population. If no environments are available, initiate the populator with a template first and then save to create an environment. Environments enable you to execute the populator with a consistent user set, ensuring uniform data across multiple runs."
    });

    cy.verifyElement({
        element: populateWithTemplatePageElements.TEMPLATE_SAVE_ENVIRONMENT_INPUT,
        elementPlaceHolder: "Enter an environment name",
    });

    cy.verifyElement({
        element: populateWithTemplatePageElements.TEMPLATE_GENERATE_DEMO_DATA_BUTTON,
        elementText: "Generate Demo Data",
    });
};

const verifyPageElementsOfDataPopulatorWithEnvironmentPage = () => {

    verifyStaticElementsOfDataPopulatorPage();

    cy.verifyElement({
        labelElement: populateWithEnvironmentPageElements.ENVIRONMENT_LABEL,
        labelText: "Environment",
        tooltipElement: populateWithEnvironmentPageElements.ENVIRONMENT_TOOLTIP,
        tooltipText: "Choose an environment for data population. If no environments are available, initiate the populator with a template first and then save to create an environment. Environments enable you to execute the populator with a consistent user set, ensuring uniform data across multiple runs."
    });

    cy.verifyElement({
        labelElement: populateWithEnvironmentPageElements.ENVIRONMENT_DATE_RANGE_LABEL,
        labelText: "Date range",
    });

    cy.verifyElement({
        element: populateWithEnvironmentPageElements.ENVIRONMENT_DATE_RANGE_SELECT,
    });

    cy.verifyElement({
        labelElement: populateWithEnvironmentPageElements.ENVIRONMENT_NUMBER_OF_RUNS_LABEL,
        labelText: "Number of runs",
        tooltipElement: populateWithEnvironmentPageElements.ENVIRONMENT_NUMBER_OF_RUNS_TOOLTIP,
        tooltipText: "Each run will go through each unique user in the environment/template and will trigger one sequence per user"
    });

    cy.verifyElement({
        labelElement: populateWithEnvironmentPageElements.ENVIRONMENT_NUMBER_OF_RUNS_10_LABEL,
        labelText: "10"
    });

    cy.verifyElement({
        labelElement: populateWithEnvironmentPageElements.ENVIRONMENT_NUMBER_OF_RUNS_50_LABEL,
        labelText: "50"
    });

    cy.verifyElement({
        labelElement: populateWithEnvironmentPageElements.ENVIRONMENT_NUMBER_OF_RUNS_100_LABEL,
        labelText: "100"
    });

    cy.verifyElement({
        element: populateWithEnvironmentPageElements.ENVIRONMENT_GENERATE_DEMO_DATA_BUTTON,
        elementText: "Generate Demo Data",
    });
};

const verifyPageElementsOfTemplatesPage = () => {

    cy.verifyElement({
        element: dataPopulatorPageElements.TAB_DATA_POPULATOR,
        elementText: "Data Populator",
    });

    cy.verifyElement({
        element: dataPopulatorPageElements.TAB_TEMPLATES,
        elementText: "Templates",
    });

    cy.verifyElement({
        labelElement: templatesPageElements.TEMPLATES_PAGE_TITLE,
        labelText: "Templates",
        tooltipElement: templatesPageElements.TEMPLATES_PAGE_TITLE_TOOLTIP,
        tooltipText: "Manage your templates for data population"
    });

    cy.verifyElement({
        element: templatesPageElements.CREATE_NEW_TEMPLATE_BUTTON,
        elementText: "Create New Template",
    });

    cy.verifyElement({
        element: templatesDataTableElements().DATATABLE_SEARCH_INPUT,
    });

    cy.verifyElement({
        labelElement: templatesDataTableElements().COLUMN_NAME_TEMPLATE_LABEL,
        labelText: "Template",
    });

    cy.verifyElement({
        element: templatesDataTableElements().COLUMN_NAME_TEMPLATE_SORTABLE_ICON
    });

    cy.verifyElement({
        labelElement: templatesDataTableElements().COLUMN_NAME_NUMBER_OF_USERS_LABEL,
        labelText: "Number of Users",
    });

    cy.verifyElement({
        element: templatesDataTableElements().COLUMN_NAME_NUMBER_OF_USERS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: templatesDataTableElements().COLUMN_NAME_NUMBER_OF_EVENTS_LABEL,
        labelText: "Number of Events",
    });

    cy.verifyElement({
        element: templatesDataTableElements().COLUMN_NAME_NUMBER_OF_EVENTS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: templatesDataTableElements().COLUMN_NAME_VIEWS_LABEL,
        labelText: "Views",
    });

    cy.verifyElement({
        element: templatesDataTableElements().COLUMN_NAME_VIEWS_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: templatesDataTableElements().COLUMN_NAME_SEQUENCES_LABEL,
        labelText: "Sequences",
    });

    cy.verifyElement({
        element: templatesDataTableElements().COLUMN_NAME_SEQUENCES_SORTABLE_ICON,
    });

    cy.verifyElement({
        labelElement: templatesDataTableElements().COLUMN_NAME_GENERATED_ON_LABEL,
        labelText: "Generated On",
    });

    cy.verifyElement({
        element: templatesDataTableElements().COLUMN_NAME_GENERATED_ON_SORTABLE_ICON,
    });

    verifyTemplatesDataTable({
        index: 0,
        shouldNotEqual: true,
    });
};

const verifyTemplatesDataTable = ({
    index = 0,
    shouldNotEqual = false,
    template = null,
    numberOfUsers = null,
    numberOfEvents = null,
    views = null,
    sequences = null,
    generatedOn = null
}) => {

    cy.verifyElement({
        element: templatesDataTableElements(index).TEMPLATE,
        elementText: template,
        shouldNotEqual: shouldNotEqual,
    });

    cy.verifyElement({
        element: templatesDataTableElements(index).NUMBER_OF_USERS,
        elementText: numberOfUsers,
        shouldNotEqual: shouldNotEqual,
    });

    cy.verifyElement({
        element: templatesDataTableElements(index).NUMBER_OF_EVENTS,
        elementText: numberOfEvents,
        shouldNotEqual: shouldNotEqual,
    });

    cy.verifyElement({
        element: templatesDataTableElements(index).VIEWS,
        elementText: views,
        shouldNotEqual: shouldNotEqual,
    });

    cy.verifyElement({
        element: templatesDataTableElements(index).SEQUENCES,
        elementText: sequences,
        shouldNotEqual: shouldNotEqual,
    });

    cy.verifyElement({
        element: templatesDataTableElements(index).GENERATED_ON,
        elementText: generatedOn,
        shouldNotEqual: shouldNotEqual,
    });
};

const selectDataTemplate = (template) => {
    var elementItemSelector = 'el-option-test-id-' + template + '-el-options';
    cy.clickElement(populateWithTemplatePageElements.TEMPLATE_DATA_TEMPLATE_SELECT);
    cy.clickElement(elementItemSelector);
};

const selectDateRange = (startDate, endDate) => {
    cy.clickElement(populateWithTemplatePageElements.TEMPLATE_DATE_RANGE_SELECT);
    cy.typeInput(populateWithTemplatePageElements.TEMPLATE_DATE_RANGE_START_DATE, startDate);
    cy.typeInput(populateWithTemplatePageElements.TEMPLATE_DATE_RANGE_END_DATE, endDate);
    cy.clickElement(populateWithTemplatePageElements.TEMPLATE_DATE_RANGE_APPLY_BUTTON);
};

const clickNumberOfRunsAs10 = () => {
    cy.clickElement(populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_10_LABEL);
};

const clickNumberOfRunsAs50 = () => {
    cy.clickElement(populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_50_LABEL);
};

const clickNumberOfRunsAs100 = () => {
    cy.clickElement(populateWithTemplatePageElements.TEMPLATE_NUMBER_OF_RUNS_100_LABEL);
};

const clickGenerateDemoDataButton = () => {
    cy.clickElement(populateWithTemplatePageElements.TEMPLATE_GENERATE_DEMO_DATA_BUTTON);
};

const clickYesPopulateDataButton = () => {
    cy.clickElement(popUpElements.CONFIRM_POP_UP_SAVE_BUTTON);
};

const clickNavigateToHomeButton = () => {
    cy.clickElement(popUpElements.SUCCESS_POP_UP_GO_TO_HOME_BUTTON);
};

const clickDataPopulatorTab = () => {
    cy.clickElement(dataPopulatorPageElements.TAB_DATA_POPULATOR);
};

const clickTemplatesTab = () => {
    cy.clickElement(dataPopulatorPageElements.TAB_TEMPLATES);
};

const clickPopulateWithTemplateTab = () => {
    cy.clickElement(dataPopulatorPageElements.TAB_POPULATE_WITH_TEMPLATE);
};

const clickPopulateWithEnvironmentTab = () => {
    cy.clickElement(dataPopulatorPageElements.TAB_POPULATE_WITH_ENVIRONMENT);
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
    }
    else {
        clickNumberOfRunsAs10();
    }

    clickGenerateDemoDataButton();
    clickYesPopulateDataButton();

    cy
        .elementExists(popUpElements.GENERATING_POP_UP_PROGRESS_BAR)
        .then((isExists) => {
            if (isExists) {
                cy.shouldNotExist(popUpElements.GENERATING_POP_UP_PROGRESS_BAR);
            }
        });

    clickNavigateToHomeButton();
};

module.exports = {
    clickDataPopulatorTab,
    clickTemplatesTab,
    clickPopulateWithTemplateTab,
    clickPopulateWithEnvironmentTab,
    verifyPageElementsOfDataPopulatorWithTemplatePage,
    verifyPageElementsOfDataPopulatorWithEnvironmentPage,
    verifyPageElementsOfTemplatesPage,
    verifyTemplatesDataTable,
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