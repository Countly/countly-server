/* globals  countlyCommon, $*/
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

        return $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + '/notes/save',
            data: {
                args: JSON.stringify(args),
                app_id: args.app_id,
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