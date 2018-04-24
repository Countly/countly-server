var puppeteer = require('puppeteer');
var Promise = require('bluebird');

exports.renderView = function(options){
    Promise.coroutine(function * (){
        var browser = yield puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        var page = yield browser.newPage();
        
        var token = options.token;
        var view = options.view;
        var id = options.id;
        var path = options.savePath || "scrn_" + Date.now() + ".png";
        var cbFn = options.cbFn || function(){};
        cbFn = function(){
            var $ = window.$;
            $("body").css({ "min-width": "0px" });
            $("html").alterClass('theme-*', 'theme-5');
            $("#fullscreen, #fullscreen-alt").trigger("click");
            $("#dashboards #fullscreen").remove();
            $("#dashboards .logo.full-screen").remove();
            $("#dashboards #dashboard-name").addClass("remove-before")
            $("#dashboards #dashboard-name").html("Developer Dashboard");
            $("#dashboards #add-widget-button-group").remove();
            $("#dashboards #date-selector").html("<div style='margin:8px 0px 0px 2px; font-size:18px;'>01 - 20 April 2018</div>");
            $("#dashboards .live").parents(".grid-stack-item").hide();
        };
        
        options.dimensions = {
            width: options.dimensions && options.dimensions.width ? options.dimensions.width : 1366,
            height: options.dimensions && options.dimensions.height ? options.dimensions.height : 0,
            padding: options.dimensions && options.dimensions.padding ? options.dimensions.padding : 0,
            scale: options.dimensions && options.dimensions.scale ? options.dimensions.scale : 2
        }

        yield page.goto('https://prikshit.count.ly/login/token/'+token);    
    
        yield page.waitFor(1 * 1000);
    
        yield page.goto('https://prikshit.count.ly'+view);
    
        yield page.waitFor(5 * 1000);
            
        yield page.evaluate(cbFn);
        
        yield page.waitFor(2 * 1000);

        yield page.setViewport({width: parseInt(options.dimensions.width), height: parseInt(options.dimensions.height), deviceScaleFactor: options.dimensions.scale});
    
        yield page.waitFor(2 * 1000);
        
        var bodyHandle = yield page.$('body');
        var dimensions = yield bodyHandle.boundingBox();
        
        yield page.setViewport({width: parseInt(options.dimensions.width || dimensions.width), height: parseInt(dimensions.height - options.dimensions.padding), deviceScaleFactor: options.dimensions.scale});

        yield page.waitFor(2 * 1000);

        if(id){
            var rect = yield page.evaluate(function(selector){
                var element = document.querySelector(selector);
                var dimensions = element.getBoundingClientRect();
                return {left: dimensions.x, top: dimensions.y, width: dimensions.width, height: dimensions.height, id: element.id};
            }, id)
        
            var clip = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };

            yield page.screenshot({
                path: path,
                clip: clip,
                type: 'png'
            });
        }else{
            yield page.screenshot({
                path: path,
                type: 'png'
            });
        }

        yield bodyHandle.dispose();
        yield browser.close();
    })();
}