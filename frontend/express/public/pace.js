import Pace from "pace-js";
import "pace-js/pace-theme-default.css";
import "./stylesheets/custom-pace-theme.css";

Pace.start({
    ajax: {
        ignoreURLs: [
            "action=refresh",
            "method=live",
            "stats.count.ly",
            "method=get_events",
            "display_loader=false"
        ]
    }
});