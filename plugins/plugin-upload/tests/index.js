var request = require('supertest');
var should = require('should');
var testUtils = require("../../../test/testUtils");
//var request = request(testUtils.url);
var request = request.agent(testUtils.url);
var plugins = require("../../pluginManager");
var path = require("path");
var fs = require("fs");
const fse = require('fs-extra') // delete folders

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";

function addTest(name,ext,description,myvalue){
    describe(ext+":"+description, function(){
        it("test "+name+" ("+ext+")", function(done){
            var dir = path.resolve(__dirname, name+'.'+ext);
            request
            .post('/plugins/plugin-upload?_csrf='+testUtils.getCSRF()+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .attach('new_plugin_input', dir)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                (res.text).should.be.exactly(myvalue);
                done();
            });
        });
    });
    
    describe("Cleanup:", function(){
        it("check if cleaned up -  "+name+" ("+ext+")", function(done){
            var dir = path.resolve(__dirname + '/../frontend/upload');
            if (!fs.existsSync(dir))
                done();
            else
                done("Upload folder not deleted");
        });
    });
    
    describe("No new plugins", function(){
        it("check if plugin not created -  "+name+" ("+ext+")", function(done){
            var dir = path.resolve(__dirname + '/../../plugin_example');
            if (!fs.existsSync(dir))
                done();
            else
               done("Plugin folder is created");
        });
    });
}

function addOkTest(name,ext,description,pluginName){
    describe(ext+":"+description, function(){
        it("test "+name+" ("+ext+")", function(done){
            var dir = path.resolve(__dirname, name+'.'+ext);
            request
            .post('/plugins/plugin-upload?_csrf='+testUtils.getCSRF()+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .attach('new_plugin_input', dir)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                (res.text).should.be.exactly("Success."+pluginName);
                done();
            });
        });
    });
    
    describe("Cleanup:", function(){
        it("check if cleaned up -  "+name+" ("+ext+")", function(done){
            var dir = path.resolve(__dirname + '/../frontend/upload');
            if (!fs.existsSync(dir))
                done();
            else
                done("Upload folder not deleted");
        });
    });
    
    describe("Plugin copied in right folder", function(){
        it("check if plugin created -  "+name+" ("+ext+")", function(done){
            var dir = path.resolve(__dirname + '/../../plugin_example');
            if (fs.existsSync(dir))
                done();
            else
               done("Plugin folder not created");
        });
    });
    
    describe("Remove plugin", function(){
        it("Remove newly added plugin -  "+name+" ("+ext+")", function(done){
            var dir = path.resolve(__dirname + '/../../plugin_example');
            fse.remove(dir)
            .then(() => {done();})
            .catch(err => {done(err);});
        });
    });  
}

//Validating empty upload+ logging in
describe("Setup+check empty upload", function(){
        before(function( done ){
            testUtils.logout();
            testUtils.login( request );
            testUtils.waitLogin( done );
        });
        it("check empty", function(done){
        
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");

            request
            .post('/plugins/plugin-upload?_csrf='+testUtils.getCSRF()+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                (res.text).should.be.exactly("nofile");
                done(); 
            });
        });
    });
    
        
var ext = ["zip","tar.gz","tar"];
var testnames = {
    "package_invalid":"Uploading plugin should fail with error : package invalid -  Unable to parse package file",
    "package_missing":"Uploading plugin should fail with error : package missing - Package file not found",
    "name_missing":"Uploading plugin should fail with error : name_missing - Name attribute is not defined in package.json",
    "title_missing":"Uploading plugin should fail with error : title_missing - Title attribute is not defined in package.json",
    "version_missing":"Uploading plugin should fail with error : version_missing  - Version attribute is not defined in package.json",
    "description_missing":"Uploading plugin should fail with error : description_missing  - Version attribute is not defined in package.json",
    "name_invalid":"Uploading plugin should fail with error : name_invalid - Chosen package name contains invalid symbol - '.'",
    "existing_name":"Uploading plugin should fail with error : existing_name - Plugin with the same name listed in plugins.ee.json",
    "enabled_plugin":"Uploading plugin should fail with error : enabled_plugin Plugin with the same name listed in plugins.json",
    "apijs_missing": "Uploading plugin should fail with error: /api/api.js missing",
    "appjs_missing": "Uploading plugin should fail with error: /frontend/app.js missing",
    "public_missing": "Uploading plugin should fail with error: /frontend/public folder missing",
    "install_missing": "Uploading plugin should fail with error: install.js file missing",
    "uninstall_missing": "Uploading plugin should fail with error: uninstall.js file missing",
    "init_missing": "Uploading plugin should fail with error: init() in app.js missing",
    "javascripts_missing": "Uploading plugin should fail with error: /frontend/public/javascripts folder missing"
};
     
for(var i=0; i<ext.length; i++)
{
    for (var key in testnames) {

        if(key=='existing_name')
        {
            var dir = path.resolve(__dirname + '/../../plugins.ee.json');
            if (fs.existsSync(dir))
                addTest(key,ext[i],testnames[key],key);
        }
        else
        {
            addTest(key,ext[i],testnames[key],key);
        }
    }
    addTest("mistake",ext[i],"api.js systax error!","/frontend.app.js SyntaxError: Unexpected identifier");
}

for(var i=0; i<ext.length; i++)
{
    addOkTest("ok",ext[i],"All files ok","plugin_example");
}




