/*global countlyVue */
(function(countlyAppManagement) {
    countlyAppManagement.getVuexModule = function() {
        var getInitialState = function() {
            return {
                selectedAppId: null,
                isDiscarded: false,
            };
        };

        var actions = {
            setSelectedAppId: function(context, payload) {
                context.commit('setSelectedAppId', payload);
            }
        };

        var mutations = {
            setSelectedAppId: function(state, value) {
                state.selectedAppId = value;
            }
        };
        return countlyVue.vuex.Module("countlyAppManagement", {
            state: getInitialState,
            actions: actions,
            mutations: mutations,
        });
    };
}(window.countlyAppManagement = window.countlyAppManagement || {}));