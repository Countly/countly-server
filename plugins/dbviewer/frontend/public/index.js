import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { validateRead } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';

import DbviewerMainView from './components/DbviewerMainView.vue';
import DbviewerAggregateView from './components/DbviewerAggregateView.vue';

import './assets/main.scss';

var FEATURE_NAME = 'dbviewer';

if (validateRead(FEATURE_NAME)) {
    var DBViewerMainView = new views.BackboneWrapper({
        component: DbviewerMainView
    });

    var DBViewerAggregateView = new views.BackboneWrapper({
        component: DbviewerAggregateView
    });

    app.route('/manage/db', 'dbs', function() {
        this.renderWhenReady(DBViewerMainView);
    });

    app.route('/manage/db/:db', 'dbs', function(db) {
        DBViewerMainView.params = {
            db: db
        };
        this.renderWhenReady(DBViewerMainView);
    });

    app.route('/manage/db/:db/:collection/*query', 'dbs', function(db, collection, query) {
        DBViewerMainView.params = {
            db: db,
            collection: collection,
            query: query
        };
        this.renderWhenReady(DBViewerMainView);
    });

    app.route('/manage/db/:db/:collection', 'dbs', function(db, collection) {
        DBViewerMainView.params = {
            db: db,
            collection: collection
        };
        this.renderWhenReady(DBViewerMainView);
    });

    app.route('/manage/db/indexes/:db/:collection', 'dbs', function(db, collection) {
        DBViewerMainView.params = {
            db: db,
            collection: collection,
            index: true
        };
        this.renderWhenReady(DBViewerMainView);
    });

    app.route('/manage/db/indexes/:db/:collection/*query', 'dbs', function(db, collection, query) {
        DBViewerMainView.params = {
            db: db,
            collection: collection,
            index: true,
            query: query
        };
        this.renderWhenReady(DBViewerMainView);
    });

    app.route('/manage/db/aggregate/:db/:collection', 'dbs', function(db, collection) {
        DBViewerAggregateView.params = {
            db: db,
            collection: collection
        };
        this.renderWhenReady(DBViewerAggregateView);
    });

    app.route('/manage/db/aggregate/:db/:collection/*query', 'dbs', function(db, collection, query) {
        DBViewerAggregateView.params = {
            db: db,
            collection: collection,
            query: query
        };
        this.renderWhenReady(DBViewerAggregateView);
    });

    app.addMenu("management", {code: "db", permission: FEATURE_NAME, url: "#/manage/db", text: "dbviewer.title", priority: 120});
}
