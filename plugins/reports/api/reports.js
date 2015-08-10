var reports = {},
    async = require("async"),
    fetch = require("../../../api/parts/data/fetch"),
    moment = require("moment"),
    ejs = require("ejs"),
    fs = require('fs'),
    path = require('path'),
    parser = require('properties-parser'),
    request = require('request'),
    mail = require("../../../api/parts/mgmt/mail"),
    countlySession = require('../../../api/lib/countly.session.js'),
    versionInfo = require('../../../frontend/express/version.info');
    
versionInfo.page = (!versionInfo.title) ? "http://count.ly" : null;
versionInfo.title = versionInfo.title || "Countly";
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
(function (reports) {
    reports.sendReport = function(db, id, callback){
        reports.getReport(db, id, function(err, ob){
            if(!err){
                reports.send(ob.report, ob.message);
            }
            if(callback)
                callback(err, ob.message);
        });
    };
    reports.getReport = function(db, id, callback){
        db.collection('reports').findOne({_id:db.ObjectID(id)},function(err, report){
            if(report && report.apps){
                var endDate = new Date();
                report.end = endDate.getTime();
                report.start = report.end - 24*60*60*1000;
                if(report.frequency == "weekly")
                    report.start = report.end - 7*24*60*60*1000;
                
                var startDate = new Date(report.start);
                report.date = startDate.getDate()+" "+months[startDate.getMonth()];
                if(report.frequency == "weekly")
                    report.date += " - "+endDate.getDate()+" "+months[endDate.getMonth()];
                var params = {qstring:{period:"["+report.start+","+report.end+"]"}};
                
                function metricIterator(metric, done){
                    fetch.getTimeObj(metric, params, function(output){
                        done(null, {metric:metric, data:output});
                    })
                };
                
                function appIterator(app_id, done){
                    db.collection('apps').findOne({_id:db.ObjectID(app_id)},function(err, app){
                        if (app) {
                            params.app_id = app['_id'];
                            params.app_cc = app['country'];
                            params.app_name = app['name'];
                            params.appTimezone = app['timezone'];
                            params.app = app;
                            async.map(metricsToCollections(report.metrics), metricIterator, function(err, results) {
                                app.results = results;
                                done(null, app);
                            });
                        }
                        else
                           done(null, null); 
                    });
                };
                async.map(report.apps, appIterator, function(err, results) {
                    report.total_new = 0;
                    for(var i = 0; i < results.length; i++){
                        for(var j = 0; j < results[i].results.length; j++){
                            if(results[i].results[j].metric == "users"){
                                countlySession.setDb(results[i].results[j].data || {});
                                results[i].results[j].data = countlySession.getSessionData();
                                if(results[i].results[j].data.total_sessions.total > 0)
                                    results[i].display = true;
                                report.total_new += results[i].results[j].data.new_users.total;
                            }
                        }
                    }
                    
                    function process(){
                        mail.lookup(function(err, host) {
                            //generate html
                            var dir = path.resolve(__dirname, '../frontend/public');
                            //get template
                            fs.readFile(dir+'/templates/email.html', 'utf8', function (err,template) {
                                if (err) {
                                    if(callback)
                                        callback(err, {report:report});
                                }
                                else{
                                    //get language property file
                                    fs.readFile(dir+'/localization/reports.properties', 'utf8', function (err,properties) {
                                        if (err) {
                                        if(callback)
                                            callback(err, {report:report});
                                        }
                                        else{
                                        var props = parser.parse(properties);
                                        report.properties = props;
                                        var message = ejs.render(template, {"apps":results, "host":host, "report":report, "version":versionInfo, "properties":props});
                                        if(callback)
                                            callback(err, {report:report, message:message});
                                        }
                                    });
                                }
                            });
                        });
                    }
                    
                    if(versionInfo.title.indexOf("Countly") > -1){
                        var options = {
                            uri: 'http://count.ly/email-news.json',
                            method: 'GET'
                        };
                
                        request(options, function (error, response, body) {
                            if(!error){
                                try{
                                    report.universe = JSON.parse(body);
                                }
                                catch(ex){}
                            }
                            process();
                        });
                    }
                    else{
                        process();
                    }
                });
            }
            else if(callback)
                callback("Report not found", {report:report});
        });
    };
    
    reports.send = function(report, message){
        if(report.emails){
            for(var i = 0; i < report.emails.length; i++){
                var msg = {
                    to:report.emails[i],
                    from:versionInfo.title,
                    subject:versionInfo.title+': You had '+report.total_new+' new users '+report.properties["reports.time-"+report.frequency]+'!',
                    html: message
                };
                mail.sendMail(msg)
            }
        }
    };
    
    function metricsToCollections(metrics){
        var collections = {users:true};
        for(var i in metrics){
            if(metrics[i]){
                if(i == "total_sessions" || i == "total_users" || i == "new_users" || i == "total_time" || i == "avg_time")
                    collections["users"] = true;
            }
        }
        return Object.keys(collections);
    }
    
}(reports));

module.exports = reports;