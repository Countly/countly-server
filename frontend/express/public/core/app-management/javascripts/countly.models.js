/*global countlyVue,*/
(function(countlyAppManagement) {

    countlyAppManagement.service = {
    };

    countlyAppManagement.getVuexModule = function() {

        var getInitialState = function() {
            return {
                selectedAppId: null
            };
        };

        var appManagementActions = {
            onAppSelect: function(context, payload) {
                context.commit('setSelectedAppId', payload);
            }
        };

        var appManagementMutations = {
            setSelectedAppId: function(state, value) {
                state.selectedAppId = value;
            },
        };

        return countlyVue.vuex.Module("countlyAppManagement", {
            state: getInitialState,
            actions: appManagementActions,
            mutations: appManagementMutations,
        });
    };
}(window.countlyAppManagement = window.countlyAppManagement || {}));