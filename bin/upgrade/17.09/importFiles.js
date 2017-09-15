var countlyFs = require("../../../api/utils/countlyFs");
var fs = require("fs");
var path = require("path");
var async = require("async");

function importFiles(pathToFolder, name, callback){
    var dir = path.resolve(__dirname, pathToFolder);
    
    fs.readdir( dir, function( err, files ) {
        var exclude = [".", "..", ".gitignore"];
        async.each(files, function(file, done){
            if(exclude.indexOf(file) === -1){
                countlyFs.saveFile(name, dir+"/"+file, {id:file, writeMode:"overwrite"}, function(err){
                    console.log("Storing file finished", file, err);
                    done();
                });
            }
            else{
                done();
            }
        }, function(){
            callback();
        });
    });
}

importFiles("../../../frontend/express/public/appimages", "appimages", function(){
    importFiles("../../../frontend/express/public/userimages", "userimages", function(){
        importFiles("../../../plugins/crashes/symbols", "crash_symbols", function(){
            countlyFs.getHandler().close();
        });
    });
});