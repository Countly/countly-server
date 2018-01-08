var request = require('supertest');
var should = require('should');
var testUtils = require("../../../test/testUtils");
//var request = request(testUtils.url);
var request = request.agent(testUtils.url);
var plugins = require("../../pluginManager");
var path = require("path");
var fs = require("fs");
const fse = require('fs-extra') // delete folders
var crypto = require('crypto');
var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";

 var testapp="";
 var test_export_id="";
   var db = plugins.dbConnection();
//Validating empty upload+ logging in


var counter=0;

function validate_files(exportid, apps)
{
    var prefix = ["apps-",'app_users','metric_changes','app_crashes','app_crashgroups','app_crashusers','app_viewdata','app_views','campaign_users','campaigndata-','campaigns-','graph_notes-','messages-',"browser-","carriers-","cities-","crashdata-","density-","device_details-","devices-","langs-","sources-","users-","retention_daily-","retention_weekly-","retention_monthly-"]
    
    for(var i=0; i<apps.length; i++)
    {
        for(var j=0; j<prefix.length; j++)
        {
            var dir = path.resolve(__dirname,'./../export/'+exportid+'/'+prefix[j]+apps[i]+".json");
            if (!fs.existsSync(dir))
            {
                return "File missing: "+dir;
            }
        }
    }
    return true;
}
function validate_result(done,max_wait,wait_on,fail_on)
{
    if(counter<=max_wait)
    {
        request
        .post('/o/datamigration/getstatus?exportid='+test_export_id+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(200)
        .end(function(err, res){
            var ob = JSON.parse(res.text);
            if(ob.result.status==wait_on)
            {
                (ob.result._id).should.be.exactly(test_export_id);
                done(); 
            }
            else if(ob.result.status==fail_on)
            {
                done("Export changed to status "+fail_on+". Was expected to reach status "+wait_on);
            }
            else
            {
                counter=counter+1;
                setTimeout(function(){validate_result(done,max_wait,wait_on,fail_on);},1000);
            }
        });    
    }
    else
    {
        done("Stopped waiting for update.(was expected to finish under  "+max_wait+" seconds). ");
    }

}

function validate_import_result(done,max_wait,exportid)
{
    if(counter<=max_wait)
    {
        //check if info file is here
        //check log file
        

        if(!fs.existsSync(path.resolve(__dirname,'./../import/'+exportid+'.tar.gz')) &&
            !fs.existsSync(path.resolve(__dirname,'./../import/'+exportid+'')) &&
            fs.existsSync(path.resolve(__dirname,'./../import/'+exportid+'.json')) &&
            fs.existsSync(path.resolve(__dirname,'./../../../log/dm-import_'+exportid+'.log'))    
        )
            done();
        else
        {
            counter=counter+1;
            setTimeout(function(){validate_import_result(done,max_wait,exportid);},1000);
        }
    }
    else
    {
        done("Stopped waiting for update.(was expected to finish under  "+max_wait+" seconds). ");
    }

}


function check_if_empty_list_test()
{
    it("Check if export list epmty", function(done){
            request
            .post('/o/datamigration/getmyexports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("You don't have any exports");
                done(); 
            });
        });
}

describe("Testing data migration plugin", function(){
describe("Catching invalid export parameters", function(){
    it("Check if export list empty", function(done){
         API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
            .post('/o/datamigration/getmyexports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("You don't have any exports");
                done(); 
            });
        });
        
    it("Try exporting without any id", function(done){
            request
            .post('/i/datamigration/export?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(404)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("Please provide at least one app id to export data");
                done(); 
            });
        });
        check_if_empty_list_test();
          
        
    it("Token missing", function(done){
        request
        .post('/i/datamigration/export?apps=000f1f77bcf86cd799439011&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(404)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly('Missing parameter "server_token"');
            done(); 
        });
    });
    check_if_empty_list_test();
        
    it("Check if export list epmty", function(done){
        request
        .post('/o/datamigration/getmyexports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly("You don't have any exports");
            done(); 
        });
    });
        
    it("Address missing", function(done){
        request
        .post('/i/datamigration/export?apps=000f1f77bcf86cd799439011&server_token=111111&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(404)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly('Missing parameter "server_address"');
            done(); 
        });
    });
        
          it("Check if export list epmty", function(done){
            request
            .post('/o/datamigration/getmyexports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("You don't have any exports");
                done(); 
            });
        });
        it("Try exporting with invaild id", function(done){
            request
            .post('/i/datamigration/export?only_export=1&apps=1246&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(404)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("Given app id is/are not valid:1246");
                done(); 
            });
        });
        
          it("Check if export list epmty", function(done){
            request
            .post('/o/datamigration/getmyexports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("You don't have any exports");
                done(); 
            });
        });
        
        it("Try exporting with not existing app id", function(done){
            request
            .post('/i/datamigration/export?only_export=1&apps=507f1f77bcf86cd799439011&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(404)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("You don't have any apps with given ids:507f1f77bcf86cd799439011");
                done(); 
            });
        });
        
          it("Check if export list epmty", function(done){
            request
            .post('/o/datamigration/getmyexports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("You don't have any exports");
                done(); 
            });
        });
});
describe("Create simple export", function(){
        it('Create dummy app', function(done){ 
            request
            .post('/i/apps/create?api_key='+API_KEY_ADMIN+'&args={"name":"Test my app","type":"mobile"}')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                
                testapp = JSON.parse(res.text);
                testapp.should.have.property("name", "Test my app");
                testapp.should.have.property("type", "mobile");
                done();
            });
            
        });  
        
        it("Run simple export", function(done){
            request
            .post('/i/datamigration/export?only_export=1&apps='+testapp._id+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var apps = [testapp._id];
                test_export_id = crypto.createHash('SHA1').update(JSON.stringify(apps)).digest('hex');
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly(test_export_id);
                done(); 
            });
        });
        
        after(function( done ){
            //checking statuss and seeing if it moves to end
            counter=0;
            setTimeout(function(){validate_result(done,60,"finished","failed");},1000);
        });
        
    });
    
    describe("Validate exported files",function(){
       it("Check for archive", function(done){
            var dir = path.resolve(__dirname,'./../export/'+test_export_id+'.tar.gz');
            var logdir = path.resolve(__dirname,'./../../../log/dm-export_'+test_export_id+'.log');
            if (fs.existsSync(dir))
                    if(fs.existsSync(logdir))
                        done();
                    else
                        done("Log file not created");
            else
               done("Archive not created");
        }); 
    });
    
    describe("Validate responses for trying to overwrite existing export",function(){
        it("Trying same export again(with existing data)", function(done){
            request
            .post('/i/datamigration/export?only_export=1&apps='+testapp._id+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(404)
            .end(function(err, res){
                if (err) return done(err);
                
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("You have already exported data.");
                done(); 
            });
        });
        
        it("Setting up data to emulate running export", function(done){
            db.collection("data_migrations").update({_id:test_export_id},{$set:{"status":"progress"}}, {upsert:true},function(err, res){
                if(err){done(err);}
                done();
            });      
        });
        
        it("Trying to rewrite running exporting process", function(done){
            request
            .post('/i/datamigration/export?only_export=1&apps='+testapp._id+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(404)
            .end(function(err, res){
                if (err) return done(err);
                
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("Already running exporting process");
                done(); 
            });
        });
    });
    describe("delete and validate after delete",function(){
        it("delete export", function(done){
            request
            .post('/i/datamigration/delete_export?exportid='+test_export_id+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("ok");
                done(); 
            });
        });
        
        it("Check for files", function(done){
            var dir = path.resolve(__dirname,'./../export/'+test_export_id+'.tar.gz');
            var logdir = path.resolve(__dirname,'./../../../log/dm-export_'+test_export_id+'.log');
            if (!fs.existsSync(dir))
                    if(!fs.existsSync(logdir))
                        done();
                    else
                        done("Log file not deleted");
            else
               done("Archive not deleted");
        }); 
    
    });
    
    describe("Try export in different path",function(){
        it("Run simple export", function(done){
            request
            .post('/i/datamigration/export?only_export=1&apps='+testapp._id+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&target_path='+path.resolve(__dirname,'./../../'))
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var apps = [testapp._id];
                test_export_id = crypto.createHash('SHA1').update(JSON.stringify(apps)).digest('hex');
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly(test_export_id);
                done(); 
            });
        });
        
         after(function( done ){
            //checking statuss and seeing if it moves to end
            counter=0;
            setTimeout(function(){validate_result(done,60,"finished","failed");},1000);
        });
    });
    
    describe("Validate exported files",function(){
        it("Check for files", function(done){
           
            var dir = path.resolve(__dirname,'./../../'+test_export_id+'.tar.gz');

            var logdir = path.resolve(__dirname,'./../../../log/dm-export_'+test_export_id+'.log');
            if(fs.existsSync(logdir))
            {
                if (fs.existsSync(dir))
                done();    
            else
               done("Archive not created");
            }
            else
                done("Log file not created");
                        
            
        }); 
        
        it("delete export", function(done){
            request
            .post('/i/datamigration/delete_export?exportid='+test_export_id+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("ok");
                done(); 
            });
        });
        
         it("Check for files", function(done){
            var dir = path.resolve(__dirname,'./../export/'+test_export_id+'.tar.gz');
            var logdir = path.resolve(__dirname,'./../../../log/dm-export_'+test_export_id+'.log');
            if (!fs.existsSync(dir))
                    if(!fs.existsSync(logdir))
                        done();
                    else
                        done("Log file not deleted");
            else
               done("Archive not deleted");
        }); 
    
    
    });
    
    
  
 describe("Valiate invalid import",function(){  
    var mytoken="";
    it("Trying import without file", function(done){
            request
            .post('/i/datamigration/import?app_id='+APP_ID+'&api_key='+API_KEY_ADMIN)
            .expect(404)
            .end(function(err, res){
                if (err) return done(err);
                
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("Import file missing");
                done(); 
            });
        });
    it("Import without any autentification", function(done){
            request
            .post('/i/datamigration/import')
            .expect(401)
            .end(function(err, res){ done(); });
        });
     it("Invalid token", function(done){
        request
        .post('/i/datamigration/import')
        .set('countly-token', '000000000000')
        .expect(400)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly('Missing parameter "api_key" or "auth_token"');
            done();
        });
    });
    it("Create token", function(done){
            request
            .post('/o/datamigration/createimporttoken?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                if(ob.result && ob.result!="")
                    mytoken = ob.result;
                else
                    done('invalid response. No token provided.'+res.text);
                done();
            });
        });
    it("Sending without file", function(done){
        request
        .post('/i/datamigration/import')
        .set('countly-token', mytoken)
        .expect(404)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly("Import file missing");
             done();
        });
    });
 });
   

 describe("Importing via token",function(){  
    var mytoken="";
    var tt="";
    it("Unauthorised", function(done){
            request
            .post('/o/datamigration/createimporttoken')
            .expect(401)
            .end(function(err, res){ done();});
        });
    it("Create token", function(done){
            request
            .post('/o/datamigration/createimporttoken?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                if(ob.result && ob.result!="")
                    mytoken = ob.result;
                else
                    done('invalid response. No token provided.'+res.text);
                done();
            });
        });
    it("Validate token ", function(done){
            
            request
            .post('/i/datamigration/import?test_con=1')
            .set('countly-token', mytoken)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                if(ob.result && ob.result=="valid")
                   done()
                else
                    done('invalid response.'+res.text);

            });
            
        });
    it("Send test ", function(done){
        tt = "b18e10498ec0f41a85bb8155ccd4a209819319a3";
        
        var dir = path.resolve(__dirname,'./'+tt+'.tar.gz');
        request
        .post('/i/datamigration/import?ts=000000&exportid='+tt)
        .attach('import_file', dir)
        .set('countly-token', mytoken)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly("Importing process started.");
             done();
        });
    });
    
    after(function( done ){
        //checking statuss and seeing if it moves to end
        counter=0;
        setTimeout(function(){validate_import_result(done,10,tt);},1000);
    });
}); 
describe("get my imports",function(){
    it("try unautorized ", function(done){
        request
        .post('/o/datamigration/getmyimports')
        .expect(400)
        .end(function(err, res){
            if (err) return done(err);
            done()
        }); 
    });
    
    it("get imports list ", function(done){
        request
        .post('/o/datamigration/getmyimports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            ob = ob.result;
            if(ob['b18e10498ec0f41a85bb8155ccd4a209819319a3'] && ob['b18e10498ec0f41a85bb8155ccd4a209819319a3']['app_list']=='Demo' && ob['b18e10498ec0f41a85bb8155ccd4a209819319a3']['log']=='dm-import_b18e10498ec0f41a85bb8155ccd4a209819319a3.log')
                done()
            else
                done("Invalid object");
        }); 
    });
});
describe("deleting import",function(){  
    it("try unautorized delete import ", function(done){
        request
        .post('/i/datamigration/delete_import?exportid=b18e10498ec0f41a85bb8155ccd4a209819319a3')
            .expect(400)
            .end(function(err, res){
            if (err) return done(err);
                done()
                
            }); 
     
    });
     it("try deleting import without passing exportid", function(done){
        request
        .post('/i/datamigration/delete_import?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(404)
            .end(function(err, res){
                if (err) return done(err);
    
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                if(ob.result && ob.result=='Missing parameter "exportid"')
                    done()
                else
                    done('invalid response. No token provided.'+res.text);
                
            }); 
     
    });
    it("delete import request ", function(done){
            request
            .post('/i/datamigration/delete_import?exportid=b18e10498ec0f41a85bb8155ccd4a209819319a3'+'&api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                var ob = JSON.parse(res.text);
                if(ob.result && ob.result=="ok")
                    done()
                else
                    done('invalid response. No token provided.'+res.text);
               
            });
        });
    it("get empty import list ", function(done){
        request
        .post('/o/datamigration/getmyimports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            if(ob.result && ob.result=="You don't have any imports")
                    done()
                else
                    done('invalid response.'+res.text);
            }); 
    });
});


 
describe("cleanup", function(){ 
    it("Remove test app", function(done){
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
        request
        .post('/i/apps/delete?api_key='+API_KEY_ADMIN+'&args={"app_id":"'+testapp._id+'"}')
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);  
                done();
        });
    });
            
    it('delete data', function(done){   
        request
        .post('/i/datamigration/delete_all?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly("ok");
            done(); 
        });
    });  
      
    it('delete collection', function(done){   
        db.collection("data_migrations").drop(function(err, res){
            if (err) return done(err);
            if(res)
                done();
            else
                done("ERROR cleaning up database");
        });
    });  
        
    it("Get export list", function(done){
        request
        .post('/o/datamigration/getmyexports?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID)
        .expect(200)
        .end(function(err, res){
            if (err) return done(err);
            var ob = JSON.parse(res.text);
            (ob.result).should.be.exactly("You don't have any exports");
            done(); 
        });
    });
});
});
