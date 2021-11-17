/*global countlyVue countlyCommon CV countlyGlobal*/

(function(countlyDataManager) {

    var EXTENDED_MODELS = countlyDataManager.extended && countlyDataManager.extended.models || {};
    var EXTENDED_SERVICE = EXTENDED_MODELS.service || {};
    var EXTENDED_MODEL = EXTENDED_MODELS.model || {};

    countlyDataManager.service = Object.assign({}, {
        loadEvents: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/data-manager/events',
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "preventRequestAbort": true,
                },
                dataType: "json"
            });
        },
        loadEventGroups: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_event_groups",
                    "preventRequestAbort": true
                },
                dataType: "json",
            });
        },
        createEventGroups: function(payload) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/event_groups/create",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "args": JSON.stringify(payload)
                },
                dataType: "json",
            });
        },
        editEventGroups: function(data, order, update_status, status) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/event_groups/update",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "args": JSON.stringify(data),
                    "event_order": order,
                    "update_status": JSON.stringify(update_status),
                    "status": status
                },
                dataType: "json",
            });
        },
        deleteEventGroups: function(events) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/event_groups/delete",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "args": JSON.stringify(events),
                },
                dataType: "json",
            });
        },
        saveEvent: function(event) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + '/data-manager/event',
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    event: JSON.stringify(event)
                },
                dataType: "json"
            });
        },
        editEvent: function(eventMap, omittedSegments) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/events/edit_map",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "event_map": JSON.stringify(eventMap),
                    "omitted_segments": JSON.stringify(omittedSegments)
                }
            });
        },
        changeVisibility: function(events, visibility) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/events/change_visibility",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "set_visibility": visibility,
                    "events": JSON.stringify(events)
                }
            });
        },
        deleteEvents: function(events) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/events/delete_events",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "events": countlyCommon.decodeHtml(JSON.stringify(events))
                }
            });
        }
    }, EXTENDED_SERVICE);

    countlyDataManager.getVuexModule = function() {
        var EXTENDED_STATE = {};
        if (EXTENDED_MODEL.state) {
            EXTENDED_STATE = EXTENDED_MODEL.state();
        }
        var EXTENDED_GETTERS = EXTENDED_MODEL.getters;
        var EXTENDED_MUTATIONS = EXTENDED_MODEL.mutations;
        var EXTENDED_ACTIONS = EXTENDED_MODEL.actions;

        var getEmptyState = function() {
            return Object.assign({}, {
                events: [],
                eventsMap: {},
                eventGroups: [],
            }, EXTENDED_STATE);
        };

        var getters = {
            events: function(state) {
                return state.events;
            },
            eventsMap: function(state) {
                return state.eventsMap;
            },
            eventGroups: function(state) {
                return state.eventGroups;
            }
        };

        var mutations = {
            setEvents: function(state, val) {
                state.events = val;
            },
            setEventsMap: function(state, val) {
                state.eventsMap = val;
            },
            setEventGroups: function(state, val) {
                state.eventGroups = val;
            },
        };

        var actions = {
            loadEventsData: function(context) {
                var evenLoaderService = countlyDataManager.service.loadEvents;
                var isDrill = countlyGlobal.plugins.indexOf("drill") > -1;
                if (isDrill && countlyDataManager.service.loadEventsExtended) {
                    evenLoaderService = countlyDataManager.service.loadEventsExtended;
                }
                evenLoaderService().then(function(data) {
                    if (data === 'Error') {
                        data = [];
                    }
                    context.commit('setEvents', data);
                    var eventsMap = {};
                    data.forEach(function(event) {
                        eventsMap[event.key] = event;
                    });
                    context.commit('setEventsMap', eventsMap);
                });
            },
            loadEventGroups: function(context) {
                countlyDataManager.service.loadEventGroups().then(function(data) {
                    context.commit('setEventGroups', data);
                    return data;
                });
            },
            deleteEventGroups: function(context, events) {
                countlyDataManager.service.deleteEventGroups(events).then(function(data) {
                    context.dispatch("loadEventGroups");
                    return data;
                });
            },
            changeEventGroupsVisibility: function(context, data) {
                countlyDataManager.service.editEventGroups(undefined, undefined, data.events, data.isVisible).then(function(res) {
                    context.dispatch("loadEventGroups");
                    return res;
                });
            },
            saveEventGroups: function(context, data) {
                countlyDataManager.service.createEventGroups(data).then(function(res) {
                    context.dispatch("loadEventGroups");
                    return res;
                });
            },
            editEventGroups: function(context, data) {
                countlyDataManager.service.editEventGroups(data).then(function(res) {
                    context.dispatch("loadEventGroups");
                    return res;
                });
            },
            saveEvent: function(context, event) {
                countlyDataManager.service.saveEvent(event).then(function(err) {
                    if (err !== 'Error') {
                        context.dispatch('loadEventsData');
                        context.dispatch('loadSegmentsMap');
                    }
                    return err;
                });
            },
            editEvent: function(context, event) {
                var eventMap = {};
                var omittedSegments = {};
                eventMap[event.key] = {
                    key: event.key,
                    name: event.name,
                    description: event.description,
                    is_visible: event.is_visible,
                    count: event.count,
                    sum: event.sum,
                    dur: event.dur,
                    category: event.category,
                    omit_list: event.omit_list || []
                };
                eventMap = JSON.parse(JSON.stringify(eventMap));
                if (Array.isArray(event.omit_list)) {
                    event.omit_list.forEach(function(omittedSegment) {
                        if (Array.isArray(omittedSegments[event.key])) {
                            omittedSegments[event.key].push(omittedSegment);
                        }
                        else {
                            omittedSegments[event.key] = [omittedSegment];
                        }
                    });
                }
                var segments = event.segments || [];
                var eventMeta = {
                    key: event.key,
                    segments: segments.map(function(segment) {
                        delete segment.audit;
                        return segment;
                    }),
                    status: event.status,
                    category: event.category
                };
                countlyDataManager.service.editEvent(eventMap, omittedSegments).then(function(err) {
                    countlyDataManager.service.editEventMeta(eventMeta).then(function(errMeta) {
                        if (err === 'Error' || errMeta === "Error") {
                            return 'Error';
                        }
                        context.dispatch('loadEventsData');
                        context.dispatch('loadValidations');
                        context.dispatch('loadSegmentsMap');
                    });
                });
            },
            omitSegments: function(context, data) {
                countlyDataManager.service.editEvent(data.eventMap, data.omittedSegments).then(function(res) {
                    if (res === 'Error') {
                        return res;
                    }
                    context.dispatch('loadEventsData');
                    context.dispatch('loadSegmentsMap');
                });
            },
            changeVisibility: function(context, data) {
                var visibility = data.isVisible ? 'show' : 'hide';
                countlyDataManager.service.changeVisibility(data.events, visibility).then(function(res) {
                    if (res === 'Error') {
                        return res;
                    }
                    context.dispatch('loadEventsData');
                    context.dispatch('loadSegmentsMap');
                });
            },
            deleteEvents: function(context, events) {
                countlyDataManager.service.deleteEvents(events).then(function(res) {
                    countlyDataManager.service.deleteEventsMeta(events).then(function(res2) {
                        if (res === 'Error' || res2 === 'Error') {
                            return 'Error';
                        }
                        context.dispatch('loadEventsData');
                        context.dispatch('loadSegmentsMap');
                    });
                });
            },
        };

        return countlyVue.vuex.Module("countlyDataManager", {
            state: getEmptyState,
            getters: Object.assign({}, getters, EXTENDED_GETTERS),
            actions: Object.assign({}, actions, EXTENDED_ACTIONS),
            mutations: Object.assign({}, mutations, EXTENDED_MUTATIONS),
            submodules: []
        });
    };
}(window.countlyDataManager = window.countlyDataManager || {}));