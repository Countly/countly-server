var mongo = require('../');
var db = mongo.db('192.168.0.103/test');
// var db = mongo.db('127.0.0.1/test');
var myconsole = require('myconsole');

var foo = db.collection('foo');

setInterval(function() {
    foo.insert({foo:'foo'}, function(err, result){
        if(err) return myconsole.error(err);
        foo.count(function(err, count){
            if(err) return myconsole.error(err);
            myconsole.log('count: %d', count);
            foo.find().limit(10).toArray(function(err, arr) {
                if(err) return myconsole.error(err);
                myconsole.log('arr: %d', arr.length);
            })
        })
    })
}, 500);

process.on('SIGINT', function(){
    myconsole.log('SIGINT')
    foo.drop(function(err){
        if(err) myconsole.error(err);
        process.exit();
    })
})
