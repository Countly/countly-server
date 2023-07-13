print("adding uid to app users " + new Date());
print("This will take about 2 minutes for every 1 million user you have in the system so hang in there...");

var currDBAddress = "IP_ADDRESS:PORT";
var currDBName = "countly";

/*
    **************************************************
    ****************DO NOT EDIT BELOW*****************
    **************************************************
 */

load("parseConnection.js");

var currDBAddress = dbObject.host;
var currDBName = dbObject.name;

if (currDBAddress == "IP_ADDRESS:PORT") {
    print("**********************************");
    print("Please configure currDBAddress before running this script...");
    print("**********************************");
    quit();
}

var currConn = new Mongo(currDBAddress);
var currDB = currConn.getDB(currDBName);
if (dbObject.username && dbObject.password) {
    currDB.auth(dbObject.username, dbObject.password);
}

function parseSequence(num) {
    var valSeq = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    var digits = [];
    var base = valSeq.length;
    while (num > base - 1) {
        digits.push(num % base);
        num = Math.floor(num / base);
    }
    digits.push(num);
    var result = "";
    for (var i = digits.length - 1; i >= 0; --i) {
        result = result + valSeq[digits[i]];
    }
    return result;
}

currDB.getCollectionNames().filter(function(name) {
    return name.match(/app_users.*/);
}).forEach(function(name) {
    var userCounter = 0;
    currDB.getCollection(name).find({_id: {$ne: "uid-sequence"}}).forEach(function(doc) {
        currDB.getCollection(name).update({_id: doc._id}, {$set: {uid: parseSequence(userCounter)}});
        userCounter++;
    });

    currDB.getCollection(name).save({_id: "uid-sequence", seq: userCounter});
});

print("adding uid to app users ended " + new Date());