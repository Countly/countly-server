var mongoDB = require("./lib/mongodb")

// keep the programming running for a while
setTimeout(function(){
  console.log("end of program")
},12*60*60*1000)

mongoDB.MongoClient.connect("mongodb://localhost/test", {server:{auto_reconnect:true}}, function(err, db) {
  if (err) {console.log("error connecting. " + err.message); return }
  var testCollection=db.collection("test")

  testCollection.remove({},function(err){
    if (err) { console.log("error removing. " + err.message); return }

    testCollection.insert([{a:1, b:1}, {a:2, b:2}, {a:3, b:3}], {w:1}, function(err, result){
      if (err) { console.log("error inserting. " + err.message); return }

        console.log("shut down the db server")
        setTimeout(function(){
          console.log("starting first find...")
          db.collection("test").findOne({a:1},function(err,result){
            console.log("first find return - never gets here")
          })

          console.log("start the db server back up")
          setTimeout(function(){
            console.log("starting second find...")
            db.collection("test").findOne({a:1},function(err,result){
              console.log("second find return - never gets here")
              db.close()
            })
          },5000)

        },5000)
      })
  })
})