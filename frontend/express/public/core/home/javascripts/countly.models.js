/* global countlyVue,CV,countlyCommon*/

(function(countlyHomeView) {
    countlyHomeView.getVuexModule = function() {
        var getInitialState = function() {
            return {
                data: {},
                image: ""
            };
        };

        var HomeViewActions = {
            downloadScreen: function(context) {
                return CV.$.ajax({
                    type: "GET",
                    url: "/render?view=/dashboard&route=/" + countlyCommon.ACTIVE_APP_ID + "/",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        "id": "main_home_view",
                        options: JSON.stringify({"dimensions": {"width": 2000, "padding": 25}})
                    },
                    dataType: "json"
                }, {disableAutoCatch: true}).then(function(json) {
                    context.dispatch('onSetDownloadImage', {error: null, path: json.path});

                }).catch(function(error) {
                    context.imageToDownload = false;
                    context.dispatch('onSetDownloadImage', {error: error, path: null});
                });
            },
            updateHomeView: function(context, data) {
                return CV.$.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.users.w + "/updateHomeSettings",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        homeSettings: JSON.stringify(data)
                    },
                    dataType: "json"
                }, {disableAutoCatch: true}).then(function() {
                    //if we are here  - update is fine
                    return context.commit('setUpdateError', null);
                }).catch(function(error) {
                    return context.commit('setUpdateError', error);
                });
            },
            onFetchInit: function(context) {
                context.commit('setFetchInit');
            },
            onFetchError: function(context, error) {
                context.commit('setFetchError', error);
            },
            onFetchSuccess: function(context) {
                context.commit('setFetchSuccess');
            },
            onSetDownloadImage: function(context, data) {
                context.commit('setDownloadImage', data);
            }
        };

        var HomeViewMutations = {
            setData: function(state, value) {
                state.data = value;
            },
            setDownloadImage: function(state, data) {
                data = data || {};
                var error = data.error;
                if (error) {
                    state.image = null;
                }
                else {
                    state.image = data.path;
                }
            },
            setUpdateError: function(state, error) {
                state.updateError = error;
            },
            setFetchError: function(state, error) {
                state.isLoading = false;
                state.hasError = true;
                state.error = error;
            },
            setFetchSuccess: function(state) {
                state.isLoading = false;
                state.hasError = false;
                state.error = null;
            }
        };
        return countlyVue.vuex.Module("countlyHomeView", {
            state: getInitialState,
            actions: HomeViewActions,
            mutations: HomeViewMutations
        });
    };
}(window.countlyHomeView = window.countlyHomeView || {}));