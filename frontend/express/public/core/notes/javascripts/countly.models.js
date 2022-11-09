/* globals  countlyCommon, $, CountlyHelpers*/
(function(countlyGraphNotes) {
    countlyGraphNotes.save = function(data, callback) {
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

        if (data._id) {
            args._id = data._id;
        }
        else {
            var notes = null; //window.countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes;
            countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID], {}).then(function(res) {
                notes = res.aaData;

                if (notes.length > 0) {
                    var sortedNotes = notes.sort(function(a, b) {
                        return new Date(b.created_at) - new Date(a.created_at);
                    });
                    if (typeof sortedNotes[0].indicator !== "undefined") {
                        args.indicator = CountlyHelpers.stringIncrement(sortedNotes[0].indicator);
                    }
                    else {
                        args.indicator = "A";
                    }
                }
                else {
                    args.indicator = "A";
                }

                return $.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.w + '/notes/save',
                    data: {
                        args: JSON.stringify(args),
                        app_id: countlyCommon.ACTIVE_APP_ID,
                    },
                    dataType: "json",
                    success: function() {
                        if (callback) {
                            callback({result: "success"});
                        }
                    },
                    error: function() {
                        if (callback) {
                            callback({result: "error"});
                        }
                    }
                });
            });
        }
    };
    countlyGraphNotes.delete = function(noteId, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/notes/delete',
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                note_id: noteId,
            },
            dataType: "json",
            success: function() {
                if (callback) {
                    callback({result: "success"});
                }
            },
            error: function() {
                if (callback) {
                    callback({result: "error"});
                }
            }
        });
    };
}(window.countlyGraphNotes = window.countlyGraphNotes || {}));