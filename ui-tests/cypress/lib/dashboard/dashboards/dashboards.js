import {
    dashboardsMenuElements,
    customDashboardElements,
    customDashboardWidgetElements,
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

const verifyCustomDashboardElements = ({
    dashboardName = null,
    createdTime = null,
    createdBy = null
}) => {

    cy.verifyElement({
        labelElement: customDashboardElements.CUSTOM_DASHBOARD_TITLE,
        labelText: dashboardName
    });

    cy.verifyElement({
        element: customDashboardElements.CUSTOM_DASHBOARD_CREATED_TIME_ICON
    });

    cy.verifyElement({
        element: customDashboardElements.CUSTOM_DASHBOARD_CREATED_LABEL,
        elementText: "Created"
    });

    cy.verifyElement({
        element: customDashboardElements.CUSTOM_DASHBOARD_CREATED_TIME,
        elementText: createdTime
    });

    cy.verifyElement({
        element: customDashboardElements.CUSTOM_DASHBOARD_CREATED_BY,
        elementText: createdBy
    });
};

const verifyCustomDashboardWidgetElements = ({
    index = 0,
    widgetTitle = null,
    widgetAppName = null,
    widgetItem = null,
    widgetLabel = null
}) => {

    cy.verifyElement({
        labelElement: customDashboardWidgetElements(index).WIDGET_TITLE,
        labelText: widgetTitle
    });

    cy.verifyElement({
        element: customDashboardWidgetElements(index).WIDGET_APP_ICON
    });

    cy.verifyElement({
        labelElement: customDashboardWidgetElements(index).WIDGET_APP_NAME,
        labelText: widgetAppName
    });

    cy.verifyElement({
        element: customDashboardWidgetElements(index).WIDGET_ITEM,
        elementText: widgetItem
    });

    cy.verifyElement({
        element: customDashboardWidgetElements(index).WIDGET_MORE_OPTIONS_BUTTON
    });

    cy.verifyElement({
        element: customDashboardWidgetElements(index).WIDGET_LABEL,
        elementText: widgetLabel
    });
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
    verifyCustomDashboardElements,
    verifyCustomDashboardWidgetElements,
    clickNewWidgetButton,
    selectSourceApp,
    selectVisualizationType,
    selectMetric,
    clickCreateWidgetButton,
    openCreateNewReportDrawer
};