var pluginManager = require("../../../../plugins/pluginManager.js");

console.log("Upgrading notes data");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb
        .collection("graph_notes")
        .find({})
        .toArray(function(err, notesData) {
            const notes = [];
            notesData.forEach(app => {
                for (let dateString in app.notes) {
                    const year = dateString.substring(0, 4);
                    const month = dateString.substring(4, 6);
                    const date = dateString.substring(6, 8);
                    const hour = dateString.substring(8, 10);
                    const ts = new Date(
                        `${year}-${month}-${date} ${hour}:00`
                    ).getTime();
    
                    app.notes[dateString].forEach(n => {
                        notes.push({
                            app_id: app._id + '',
                            note: n,
                            ts: ts,
                            noteType: "public",
                            emails: [],
                            color: 1,
                            category: "session",
                            owner: null,
                            created_at: new Date().getTime(),
                            updated_at: new Date().getTime()
                        });
                    });
                }
            });
            if (notes.length > 0) {
                countlyDb.collection("notes").insert(notes, function(insertErr, result) {
                    if (insertErr) {
                        countlyDb.close();
                        return console.log(
                            "got error while createing new notes",
                            err
                        );
                    }
                    countlyDb.collection("graph_notes").drop();
                    setTimeout(()=>{
                    countlyDb.close();
                    }, 2000)
                    console.log("notes data upgrade finished");
                });
            }
            else {
                console.log("no old notes need upgrade");
                // countlyDb.collection("notes").drop();
                countlyDb.close();
            }
            // asyncjs.eachSeries(notes, upgrade, function() {
            //
            //     console.log(notes);
    
            //     countlyDb.close();
            // });
        });
});