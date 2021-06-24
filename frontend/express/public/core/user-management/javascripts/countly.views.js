/*global countlyAuth, app, countlyGlobal, _, countlyVue, countlyUserManagement, countlyCommon, CountlyHelpers */
(function() {
    var FEATURE_NAME = "global_users";

    var DataTable = countlyVue.views.create({
        template: CV.T("/core/user-management/templates/data-table.html"),
        props: {
            rows: Array
        },
        data: function() {
            return {};
        },
        created: function() {
            console.log('data-table component created');
        }
    });

    var Drawer = countlyVue.views.create({
        template: CV.T("/core/user-management/templates/drawer.html"),
        props: ['settings', 'controls', 'features'],
        created: function() {
            console.log('drawer component created');
        },
        data: function() {
            return {
                apps: [
                    {
                        label: 'App 1',
                        value: 'app1'
                    },
                    {
                        label: 'App 2',
                        value: 'app2'
                    },
                    {
                        label: 'App 3',
                        value: 'app3'
                    },
                    {
                        label: 'App 4',
                        value: 'app4'
                    }
                ],
                adminAppSelector: ''
            }
        },
        methods: {
            onClose: function() {
                console.log('drawer closed');
            },
            onSubmit: function() {
                console.log('drawer submitted');
            },
            featureBeautifier: function(featureName) {
                var fa = featureName.split('_');
                var ret = '';
                for (var i = 0; i < fa.length; i++) {
                    ret += fa[i].substr(0, 1).toUpperCase() + fa[i].substr(1, fa[i].length - 1) + ' ';
                }
                return ret;
            }
        }
    });

    // create vue view
    var ManageUsersContainer = countlyVue.views.create({
        template: CV.T("/core/user-management/templates/user-management.html"),
        components: {
            'data-table': DataTable,
            'drawer': Drawer
        },
        mixins: [countlyVue.mixins.hasDrawers("user")],
        data: function() {
            return {
                users: [],
                dummy: 'Pınar',
                currentTab: 'users',
                appId: countlyCommon.ACTIVE_APP_ID,
                drawerSettings: {
                    title: 'Create new user',
                    saveButtonLabel: 'Create User',
                    drawerWidth: '700px',
                    hasCancelButton: true,
                    cancelButtonLabel: 'Cancel'
                },
                features: []
            };
        },
        methods: {
            refresh: function() {
                console.log('refresh triggered');
            },
            createUser: function() {
                this.openDrawer("user", {full_name: '', global_admin: false});
            }
        },
        beforeCreate: function() {
            countlyUserManagement.fetchUsers()
                .then(() => {
                    this.users = Object.values(countlyUserManagement.getUsers());
                })
                .catch(function(err) {
                    console.log(err);
                })
            countlyUserManagement.fetchFeatures()
                .then(() => {
                    this.features = countlyUserManagement.getFeatures();
                })
                .catch(function(err) {
                    console.log(err);
                })
        }
    });

    // wrap vue object with backbone wrapper
    var ManageUsersView = new countlyVue.views.BackboneWrapper({
        component: ManageUsersContainer
    });

    app.ManageUsersView = ManageUsersView;

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/manage/users", "manage-users", function() {
            this.renderWhenReady(this.ManageUsersView);
        });

        app.route("/manage/users/:tab", "manage-users-tab", function() {
            // inject current tab state to vue state
            this.renderWhenReady(this.ManageUsersView);
        });
    }
})();