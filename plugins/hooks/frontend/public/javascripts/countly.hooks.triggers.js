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
                    });
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
                $(".trigger-intro").html(jQuery.i18n.prop("hooks.trigger-api-endpoint-intro-content", url));
            }
        },
        "InternalEventTrigger":{
            name: jQuery.i18n.map["hooks.InternalEventTrigger"],
            init: function() {
                var self = this;
                var internalEvents = [
            //        {value: "/crashes/new", name: "/crashes/new"},
                    {value: "/cohort/enter", name: "/cohort/enter"},
                ];
                $("#single-hook-trigger-internal-event-dropdown")
                    .clySelectSetItems(internalEvents);
                $("#single-hook-trigger-internal-event-dropdown")
                    .off("cly-select-change").on("cly-select-change", function(e, selected) {
                        self.loadEventView(selected);
                        app.localize(); 
                    });
                $("#multi-app-dropdown").on("cly-multi-select-change", function(e) {
                    self.loadCohortsData();
                });
                app.localize();
            },
            renderConfig: function(trigger) {
                var configuration = trigger.configuration;
                var self = this;
                $("#single-hook-trigger-internal-event-dropdown")
                    .clySelectSetSelection(configuration.eventType, configuration.eventType);
                switch (configuration.eventType) {
                    case "/cohort/enter":
                        var self = this;
                        setTimeout(function () {self.loadCohortsData(configuration);}, 200)
                        
                        break;
                }
            },
            getValidConfig: function() {
                var configuration = {
                    eventType: $("#single-hook-trigger-internal-event-dropdown").clySelectGetSelection()
                }
                if (!configuration.eventType) {
                    return null;
                }
                switch(configuration.eventType) {
                    case "/cohort/enter":
                        configuration.cohortID = $("#single-hook-trigger-cohort-dropdown").clySelectGetSelection();
                        if (!configuration.cohortID) {
                            return null;
                        }
                        break;
                    default:
                        return null;
                }
                console.log(configuration, "CC");
                return configuration
            },
            loadCohortsData: function(configuration) {
                $("#single-hook-trigger-cohort-dropdown").clySelectSetSelection("","");
                $("#single-hook-trigger-cohort-dropdown").clySelectSetItems([]);
                const apps = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                if (apps.length === 0) {
                     return;
                }
                $.when((function() {
                     var data = {
                         "app_id": apps[0], //countlyCommon.ACTIVE_APP_ID,
                         "method": "get_cohorts",
                         "display_loader": false
                     };
                     $.ajax({
                         type: "GET",
                         url: countlyCommon.API_PARTS.data.r,
                         data: data,
                         dataType: "json",
                         success: function(cohorts) {
                             var cohortItems = []
                             cohorts.forEach(function(c) {
                                cohortItems.push({ value: c._id, name: c.name});
                             });
                             $("#single-hook-trigger-cohort-dropdown").clySelectSetItems(cohortItems);
                             if (!(configuration && configuration.cohortID)) {
                                 return;
                             }
                             cohortItems.forEach(function(i) {
                                  if( i.value ===  configuration.cohortID ) {
                                      $("#single-hook-trigger-cohort-dropdown").clySelectSetSelection(i.value, i.name);
                                  }
                             })
                         }
                     })
                })()
             ).catch(function(err) {
                 console.log(err,"??");
             });
            },
            loadEventView: function(event) {
                var self = this;
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
                            <div class="section">
                                <div class="label" data-localize='hooks.trigger-introduction' ></div>
                                <div>
                                    <div class="trigger-intro">
                                    </div>
                                </div>
                            </div>
                        `
                        $(".internal-event-configuration-view").html(html);
                        $(".trigger-intro").html(jQuery.i18n.prop("hooks.trigger-internal-event-cohorts-enter-intro"));
                        self.loadCohortsData();
                      //  $.when(
                      //      countlyCohorts.loadCohorts(),
                      //  ).then(function() {
                      //      var cohorts = countlyCohorts.getResults();
                      //      var cohortItems = []
                      //      cohorts.forEach(function(c){
                      //         cohortItems.push({ value: c._id, name: c.name});
                      //      })
                      //      $("#single-hook-trigger-cohort-dropdown").clySelectSetItems(cohortItems);
                      //  });
                        break;
                    default:
                        $(".internal-event-configuration-view").html(event);
                }
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
