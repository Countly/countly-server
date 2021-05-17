/* globals app, countlyCommon, countlyVue */

(function(countlyCrashes) {
    countlyCrashes.getVuexModule = function() {
        var _overviewSubmodule = {
            state: function() {
                return {
                    activeFilter: {
                        os: null,
                        app_version: null,
                        fatality: "fatal"
                    },
                    data: null
                };
            },
            getters: {},
            actions: {},
            mutations: {},
            submodules: []
        };

        _overviewSubmodule.getters.activeFilter = function(state) {
            return state.activeFilter;
        };

        _overviewSubmodule.getters.crashStatistics = function(state) {
            return state.crashStatistics;
        };

        _overviewSubmodule.actions.refresh = function(context) {
            var requestParams = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "period": countlyCommon.getPeriodForAjax(),
                "method": "crashes",
                "graph": 1,
                "display_loader": false
            };

            Object.keys(context.state.activeFilter).forEach(function(filterKey) {
                var filterValue = context.state.activeFilter[filterKey];

                if (filterValue !== null) {
                    requestParams[filterKey] = filterValue;
                }
            });

            var data = countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: requestParams,
                dataType: "json",
                success: function(json) {
                    ["latest_version", "error", "os", "highest_app"].forEach(function(crashKey) {
                        if (json.crashes[crashKey] === "") {
                            json.crashes[crashKey] = "None";
                        }
                    });

                    context.state.data = json;
                }
            });

            return data;
        };

        _overviewSubmodule.mutations.setActiveFilter = function(state, value) {
            state.activeFilter = value;
        };

        _overviewSubmodule.mutations.resetActiveFilter = function(state) {
            state.activeFilter = {
                platform: null,
                version: null,
                fatality: "fatal"
            };
        };

        var _crashgroupSubmodule = {
            state: function() {
                return {
                    crashgroup: {
                        id: undefined,
                        is_resolved: false,
                        is_new: false,
                    },
                    crashes: []
                };
            },
            getters: {},
            actions: {},
            mutations: {},
            submodules: []
        };

        _crashgroupSubmodule.actions.markResolved = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "resolve").then(function() {
                context.state.crashgroup.is_resolved = true;
            });
        };

        _crashgroupSubmodule.actions.markResolving = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "resolving").then(function() {
                context.state.crashgroup.is_resolved = true;
            });
        };

        _crashgroupSubmodule.actions.markUnresolved = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "unresolve").then(function() {
                context.state.crashgroup.is_resolved = false;
            });
        };

        _crashgroupSubmodule.actions.markSeen = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "view").then(function() {
                context.state.crashgroup.is_new = false;
            });
        };

        _crashgroupSubmodule.actions.share = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "share");
        };

        _crashgroupSubmodule.actions.unshare = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "unshare");
        };

        _crashgroupSubmodule.actions.show = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "show");
        };

        _crashgroupSubmodule.actions.hide = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "hide");
        };

        _crashgroupSubmodule.actions.delete = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "delete");
        };

        _crashgroupSubmodule.actions.modifyShare = function(context, args) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "modify_share", args);
        };

        _crashgroupSubmodule.actions.addComment = function(context, body, time) {
            var originalPromise = countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "add_comment", {text: body, time: time});

            originalPromise.then(function() {
                app.recordEvent({
                    "key": "crash-comment",
                    "count": 1,
                    "segmentation": {}
                });
            });

            return originalPromise;
        };

        _crashgroupSubmodule.actions.editComment = function(context, body, time) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "edit_comment", {text: body, time: time});
        };

        _crashgroupSubmodule.actions.deleteComment = function(context, commentId) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup.id, "delete_comment", {comment_id: commentId});
        };

        var _module = {
            state: undefined,
            getters: {},
            actions: {},
            mutations: {},
            submodules: [
                countlyVue.vuex.Module("overview", _overviewSubmodule),
                countlyVue.vuex.Module("crashgroup", _crashgroupSubmodule)]
        };

        return countlyVue.vuex.Module("countlyCrashes", _module);
    };

    countlyCrashes.manipulateCrashgroup = function(id, path, args) {
        args = args || {};

        if (typeof id === "string") {
            args.crash_id = id;
        }
        else {
            args.crashes = id;
        }

        return countlyVue.$.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/crashes/" + path,
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                args: JSON.stringify(args)
            },
            dataType: "json"
        });
    };
}(window.countlyCrashes = window.countlyCrashes || {}));