/* global countlyVue, countlyAuth, CV, app, countlyCommon */

// create vue view
var ManageUsersView = countlyVue.views.create({
    template: CV.T("/core/user-management/templates/manage-users.html"),
    components: {},
    data: function() {
        return {
            isOpened: false,
            constants: {
                "visibilityOptions": [
                    {label: "Global", value: "global", description: "Can be seen by everyone."},
                    {label: "Private", value: "private", description: "Can be seen by the creator."}
                ],
                "availableProps": [
                    {label: "Type 1", value: 1},
                    {label: "Type 2", value: 2},
                    {label: "Type 3", value: 3}
                ]
            },
            title: 'Drawer title',
            saveButtonLabel: 'save button label',
            appId: countlyCommon.ACTIVE_APP_ID,
            dev: 'Furkan',
            tableRows: [],
            tableDynamicCols: [{
                value: "name",
                label: "Name",
                required: true
            },
            {
                value: "description",
                label: "Description",
                default: true
            }],
            remoteTableDynamicCols: [{
                value: "number_0",
                label: "Number 0",
                required: true
            },
            {
                value: "number_1",
                label: "Number 1"
            },
            {
                value: "number_2",
                label: "Number 2",
                default: true
            }],
            localTableTrackedFields: ['status'],
            //remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableRow, "tooManyRecords"),
            tablePersistKey: "manageUsers_localTable_" + countlyCommon.ACTIVE_APP_ID,
            remoteTablePersistKey: "manageUsers_remoteTable_" + countlyCommon.ACTIVE_APP_ID,
            currentTab: "users"
        };
    },
    methods: {
        onSubmit: function() {
            this.isOpened = false;
        },
        onClose: function() {
            this.isOpened = false;
        },
        openDrawer: function() {
            this.isOpened = true;
        }
    }
});

// wrap it
var manageUsersView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: ManageUsersView
    });
};

// inject it view into app object
app.manageUsersView = manageUsersView();

// check permission and manage client-side routing
if (countlyAuth.validateRead('global_users')) {
    app.route("/manage/users", "manageUsers", function() {
        this.renderWhenReady(app.manageUsersView);
    });
}