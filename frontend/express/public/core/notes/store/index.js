import { countlyCommon } from '../../../javascripts/countly/countly.common.js';
import jQuery from 'jquery';
import { Module } from '../../../javascripts/countly/vue/data/vuex.js';

export default Module("countlyGraphNotes", {
    state() {
        return {
            notes: [],
            colorTags: [
                { value: 1, label: "#39C0C8" },
                { value: 2, label: "#F5C900" },
                { value: 3, label: "#F96300" },
                { value: 4, label: "#F34971" },
                { value: 5, label: "#6C47FF" }
            ]
        };
    },
    mutations: {
        setNotes: function(state, value) {
            state.notes = value;
        },
        addNote: function(state, note) {
            state.notes.push(note);
        },
        removeNote: function(state, noteId) {
            state.notes = state.notes.filter(function(n) {
                return n._id !== noteId;
            });
        }
    },
    actions: {
        fetchNotes: function(context, filter) {
            return new Promise(function(resolve) {
                countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID], filter || {}, function(data) {
                    context.commit('setNotes', data);
                    resolve(data || []);
                });
            });
        },
        save: function(context, data) {
            var args = {
                note: data.note,
                ts: data.ts,
                noteType: data.noteType,
                color: data.color.value,
                category: data.category,
            };

            if (data.noteType === 'shared') {
                args.emails = data.emails;
            }
            if (data.appIds) {
                args.app_id = data.appIds;
            }
            else {
                args.app_id = countlyCommon.ACTIVE_APP_ID;
            }
            if (data._id) {
                args._id = data._id;
                args.app_id = data.app_id;
            }
            else {
                args.app_id = countlyCommon.ACTIVE_APP_ID;
            }

            return new Promise(function(resolve, reject) {
                jQuery.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.w + '/notes/save',
                    data: {
                        args: JSON.stringify(args),
                        app_id: args.app_id,
                    },
                    dataType: "json",
                    success: function() {
                        resolve({result: "success"});
                    },
                    error: function(err) {
                        reject({result: "error", message: err.responseJSON && err.responseJSON.result ? err.responseJSON.result : ""});
                    }
                });
            });
        },
        delete: function(context, noteId) {
            return new Promise(function(resolve, reject) {
                jQuery.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + '/notes/delete',
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        note_id: noteId,
                    },
                    dataType: "json",
                    success: function() {
                        resolve({result: "success"});
                    },
                    error: function(err) {
                        reject({result: "error", message: err.responseJSON && err.responseJSON.result ? err.responseJSON.result : ""});
                    }
                });
            });
        }
    }
});
