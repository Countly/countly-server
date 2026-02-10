import { views } from '../../javascripts/countly/vue/core.js';
import { registerData } from '../../javascripts/countly/vue/container.js';
import * as countlyAuth from '../../javascripts/countly/countly.auth.js';
import app from '../../javascripts/countly/countly.template.js';
import UserManagementMain from './components/UserManagementMain.vue';
import UserDrawer from './components/UserDrawer.vue';
import './assets/main.scss';

var ManageUsersView = new views.BackboneWrapper({
    component: UserManagementMain
});

app.ManageUsersView = ManageUsersView;

if (countlyAuth.validateGlobalAdmin()) {
    app.route("/manage/users", "manage-users", function() {
        var params = {
            tab: "users"
        };

        this.ManageUsersView.params = params;
        this.renderWhenReady(this.ManageUsersView);
    });

    app.route("/manage/users/:tab", "manage-users-tab", function(tab) {
        var params = {
            tab: tab
        };

        this.ManageUsersView.params = params;
        this.renderWhenReady(this.ManageUsersView);
    });
}

registerData("user-management/edit-user-drawer", {
    component: UserDrawer
});
