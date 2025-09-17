import {
    dashboardsMenuElements,
    customDashboardElements,
    customDashboardWidgetElements,
    customDashboardDrawerElements,
    newWidgetDrawerElements
} from "../../../support/elements/dashboard/dashboards/dashboards";
import sidebarElements from '../../../support/elements/sidebar/sidebar';

//Dashboard Sidebar Menu 
const clickDashboardsNewButton = () => {
    cy.clickElement(dashboardsMenuElements().DASHBOARD_NEW_BUTTON);
};

//Dashboard Drawer
const typeDashboardName = (dashboardName) => {
    cy.typeInput(customDashboardDrawerElements.DASHBOARD_NAME_INPUT, dashboardName);
};

const clickCreateDashboardButton = () => {
    cy.clickElement(customDashboardDrawerElements.CREATE_BUTTON, true);
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

const selectPrivateDashboardVisibility = () => {
    cy.clickElement(customDashboardDrawerElements.DASHBOARD_VISIBILITY_RADIO_BUTTON_PRIVATE);
};

const selectNotifyAllUsersViaEmail = () => {
    cy.clickElement(customDashboardDrawerElements.NOTIFY_VIA_EMAIL_CHECKBOX_INPUT);
};

const selectUseCustomRefreshRate = () => {
    cy.clickElement(customDashboardDrawerElements.USE_REFRESH_RATE_CHECKBOX_INPUT);
};

const selectSomeSpecificUsersDashboardVisibility = () => {
    cy.clickElement(customDashboardDrawerElements.DASHBOARD_VISIBILITY_RADIO_BUTTON_SOME_SPECIFIC_USERS);
};

const duplicateDashboard = () => {
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON);
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON_DUPLICATE_OPTION);
};

const editDashboard = () => {
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON);
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON_EDIT_OPTION);
};

const verifyDashboardEditedNotification = () => {
    cy.verifyElement({
        labelElement: customDashboardElements.NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE,
        labelText: "Dashboard edited successfully!"
    });
};

const deleteDashboard = () => {
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON);
    cy.clickElement(customDashboardElements.MORE_OPTIONS_BUTTON_DELETE_OPTION);
};

const verifyDeleteDashboardPopupElements = (dashboardName) => {

    cy.verifyElement({
        labelElement: customDashboardElements.DELETE_POPUP_TITLE,
        labelText: "Delete dashboard?"
    });

    cy.verifyElement({
        element: customDashboardElements.DELETE_POPUP_CLOSE_ICON
    });

    cy.verifyElement({
        labelElement: customDashboardElements.DELETE_POPUP_SUBTITLE,
        labelText: "Do you really want to delete dashboard called " + dashboardName + " ?"
    });

    cy.verifyElement({
        labelElement: customDashboardElements.DELETE_POPUP_CANCEL_BUTTON,
        labelText: "No, don't delete"
    });

    cy.verifyElement({
        labelElement: customDashboardElements.DELETE_POPUP_DELETE_BUTTON,
        labelText: "Yes, delete dashboard"
    });
};

const clickYesDeleteDashboardButton = () => {
    cy.clickElement(customDashboardElements.DELETE_POPUP_DELETE_BUTTON, true);
};

const verifyDashboardDeletedNotification = () => {
    cy.verifyElement({
        labelElement: customDashboardElements.NOTIFICATION_SAVED_SUCCESSFULLY_MESSAGE,
        labelText: "Dashboard deleted successfully!"
    });
};

const clickSaveDashboardButton = () => {
    cy.clickElement(customDashboardDrawerElements.CREATE_BUTTON, 1, true);
};

const typeEditPermissionEmail = (editPermissionEmail) => {
    cy.clickElement(customDashboardDrawerElements.DASHBOARD_EDIT_PERMISSIONS_INPUT);
    cy.typeInputWithIndex(customDashboardDrawerElements.DASHBOARD_EDIT_PERMISSIONS_SEARCH_BOX, editPermissionEmail, { index: 1, force: true });
    cy.clickElement(customDashboardDrawerElements.DASHBOARD_EDIT_PERMISSIONS_INPUT, true);
};

const typeViewOnlyPermissionEmail = (viewPermissionEmail) => {
    cy.clickElement(customDashboardDrawerElements.DASHBOARD_VIEW_PERMISSIONS_INPUT);
    cy.typeInputWithIndex(customDashboardDrawerElements.DASHBOARD_EDIT_PERMISSIONS_SEARCH_BOX, viewPermissionEmail, {index: 1, force: true});
};

const searchDashboard = (dashboardName) => {
    cy.clickElement(sidebarElements.SIDEBAR_MENU_OPTIONS.DASHBOARDS);
    cy.typeInput(dashboardsMenuElements().DASHBOARD_SEARCH_BOX, dashboardName);
};

const verifyDashboardShouldBeDeleted = () => {
    cy.shouldNotExist(customDashboardElements.DASHBOARD_ITEM);
};


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
    openCreateNewReportDrawer,
    selectPrivateDashboardVisibility,
    selectNotifyAllUsersViaEmail,
    selectUseCustomRefreshRate,
    selectSomeSpecificUsersDashboardVisibility,
    duplicateDashboard,
    editDashboard,
    verifyDashboardEditedNotification,
    deleteDashboard,
    verifyDeleteDashboardPopupElements,
    clickYesDeleteDashboardButton,
    verifyDashboardDeletedNotification,
    clickSaveDashboardButton,
    typeEditPermissionEmail,
    typeViewOnlyPermissionEmail,
    searchDashboard,
    verifyDashboardShouldBeDeleted
};