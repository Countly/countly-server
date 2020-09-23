/*global
    jQuery
 */

(function(hooksPlugin, jQuery) {
    var _hookTriggers = {
        "APIEndPointTrigger": {
            name: jQuery.i18n.map["hooks.APIEndPointTrigger"],
            init: function() {
                app.localize();
                function uuidv4() {
                    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function (c) {
                        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    })
                };
                $("#api-endpoint-trigger-uri").val(uuidv4());
                this.renderIntro();
            },
            renderConfig: function(trigger) {
                var configuration = trigger.configuration;
                $("#api-endpoint-trigger-uri").val(configuration.path);
                this.renderIntro();
            },
            getValidConfig: function() {
                var uri = $("#api-endpoint-trigger-uri").val();
                if(!uri) {
                    return null
                }
                return {path: uri, method: 'get'};
            },
            renderIntro: function() {
                var url = window.location.protocol + "//" + window.location.host + "/o/hooks/" +  $("#api-endpoint-trigger-uri").val()
                $(".api-endpoint-intro").html(jQuery.i18n.prop("hooks.trigger-api-endpoint-intro-content", url));
            }
        },
        "InternalEventTrigger":{
            name: jQuery.i18n.map["hooks.InternalEventTrigger"],
            init: function() {
                var self = this;
                var internalEvents = [
                    {value: "/crashes/new", name: "/crashes/new"},
                    {value: "/cohort/enter", name: "/cohort/enter"},
                ];
                $("#single-hook-trigger-internal-event-dropdown").clySelectSetItems(internalEvents);
                $("#single-hook-trigger-internal-event-dropdown").off("cly-select-change").on("cly-select-change", function(e, selected) {
                    self.loadEventView(selected);
                    app.localize(); 
                });
                app.localize();
            },
            loadEventView: function(event) {
                var html = "";
                switch(event) {
                    case "/cohort/enter": 
                        html = `
                            <div class="section">
                                <div class="label" data-localize='hooks.cohort-selector-title'></div>
                                <div id="single-hook-trigger-cohort-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">
                                    <div class="select-inner">
                                        <div class="text-container">
                                            <div class="text">
                                                <div class="default-text" data-localize='hooks.cohort-selector-placeholder'></div>
                                            </div>
                                        </div>
                                        <div class="right combo"></div>
                                    </div>
                                    <div class="select-items square" style="width: 100%;"></div>
                                </div>
                            </div>
                        `
                        $(".internal-event-configuration-view").html(html);
                        $.when(
                            countlyCohorts.loadCohorts(),
                        ).then(function() {
                            var cohorts = countlyCohorts.getResults();
                            var cohortItems = []
                            cohorts.forEach(function(c){
                               cohortItems.push({ value: c._id, name: c.name}); 
                            })
                            $("#single-hook-trigger-cohort-dropdown").clySelectSetItems(cohortItems);
                        });
                        break;
                    default:
                        $(".internal-event-configuration-view").html(event);
                }
            },
            getValidConfig: function() {
            },
        }
    }

    /**
     * get default hook triggers dictionary
     * @return {objecT} hook triggers dictionary
     */
    hooksPlugin.getHookTriggers = function () {
        return _hookTriggers;
    }
}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
