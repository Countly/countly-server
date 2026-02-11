import { views, registerGlobally } from '../../javascripts/countly/vue/core.js';
import { app } from '../../javascripts/countly/countly.template.js';

import countlyGraphNotes from './store/index.js';
import GraphNotes from './components/GraphNotes.vue';

// Register Vuex module globally so it's available on all pages
// (AnnotationDrawer is used by dashboards widgets, not just the graph-notes route)
registerGlobally(countlyGraphNotes);

app.route("/analytics/graph-notes", "graphNotes", function() {
    var graphNotesView = new views.BackboneWrapper({
        component: GraphNotes
    });
    this.renderWhenReady(graphNotesView);
});
