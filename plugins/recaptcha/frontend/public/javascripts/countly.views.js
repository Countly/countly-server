/*global app, $ */
$(document).ready(function() {
    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("recaptcha", "recaptcha.title");
    }
});