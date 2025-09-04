import {
    dashboardsMenuElements,
    customDashboardElements,
    customDashboardDrawerElements,
    newWidgetDrawerElements
} from "../../../support/elements/dashboard/dashboards/dashboards";

//Dashboard Sidebar Menu 
const clickDashboardsNewButton = () => {
    cy.clickElement(dashboardsMenuElements().DASHBOARD_NEW_BUTTON);
};

//Dashboard Drawer
const typeDashboardName = (dashboardName) => {
    cy.typeInput(customDashboardDrawerElements.DASHBOARD_NAME_INPUT, dashboardName);
};

const clickCreateDashboardButton = () => {
    cy.clickElement(customDashboardDrawerElements.CREATE_BUTTON);
    cy.checkPaceActive();
};

const verifyDashboardCreatedNotification = () => {
    cy.verifyElement({
        labelElement: customDashboardElements.NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE,
        labelText: "Dashboard created successfully!"
    });
};

const verifyWidgetCreatedNotification = () => {
    cy.verifyElement({
        labelElement: customDashboardElements.NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE,
        labelText: "Widget created successfully!"
    });
};

const closeNotification = () => {
    cy.clickElement(customDashboardElements.NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE_CLOSE_ICON);
};

//Custom Dashboard Page
const clickNewWidgetButton = () => {
    cy.clickElement(customDashboardElements.NEW_WIDGET_BUTTON);
};

const openCreateNewReportDrawer = () => {
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON);
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON_CREATE_REPORTS_OPTION);
};

//Widget Drawer
const selectSourceApp = (appName) => {
    cy.selectListBoxItem(newWidgetDrawerElements.SELECT_SOURCE_APP, appName);
};

const selectVisualizationType = (visualizationType) => {
    cy.clickElement(newWidgetDrawerElements[`VISUALIZATION_TYPE_ITEM_${visualizationType.toUpperCase().replaceAll(' ', '_')}`]);
};

const selectMetric = (metricName) => {
    cy.selectOption(newWidgetDrawerElements.SELECT_METRIC, metricName);
};

const clickCreateWidgetButton = () => {
    cy.clickElement(newWidgetDrawerElements.CREATE_WIDGET_BUTTON);
};

//

module.exports = {
    clickDashboardsNewButton,
    typeDashboardName,
    clickCreateDashboardButton,
    verifyDashboardCreatedNotification,
    verifyWidgetCreatedNotification,
    closeNotification,
    clickNewWidgetButton,
    selectSourceApp,
    selectVisualizationType,
    selectMetric,
    clickCreateWidgetButton,
    openCreateNewReportDrawer
};