import { app } from "../../../../frontend/express/public/javascripts/countly/countly.template.js"

if (app.configurationsView) {
    app.configurationsView.registerLabel("recaptcha", "recaptcha.title");
}