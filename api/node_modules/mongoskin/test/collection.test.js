
/**
 * Module dependencies.
 */

var mongoskin = require('../')
  , should = require('should');


module.exports = {
    'test id()': function() {
        var db = mongoskin.db('localhost/test');
        db.bind('testcollection');
        var id = '4ec4b2b9f44a927223000001';
        id = db.testcollection.id(id);
        id.should.be.instanceof(db.testcollection.ObjectID);
        id = db.testcollection.id(id);
        id.should.be.instanceof(db.testcollection.ObjectID);
        db.close();
    },
    'test findById string id': function() {
        var db = mongoskin.db('localhost/test');
        var ObjectID = db.db.bson_serializer.ObjectID;
        db.bind('article');
        var now = new Date();
        var article = {title: 'test article title ' + now.getTime(), created_at: now};
        db.article.insert(article, function(err, obj) {
            should.not.exist(err);
            should.exist(obj);
            obj.should.have.length(1);
            article.should.have.property('_id').with.instanceof(ObjectID);
            obj[0].should.have.property('_id').with.instanceof(ObjectID);
            
            var count = 2;
            db.article.findById(article._id.toString(), function(err, obj) {
                should.not.exist(err);
                should.exist(obj);
                obj.should.have.property('_id').with.instanceof(ObjectID);
                obj._id.should.eql(article._id);
                if(--count === 0) {
                    db.close();
                }
            });
            db.article.findById(article._id, function(err, obj) {
                should.not.exist(err);
                should.exist(obj);
                obj.should.have.property('_id').with.instanceof(ObjectID);
                obj._id.should.eql(article._id);
                if(--count === 0) {
                    db.close();
                }
            });
        });
    }
};