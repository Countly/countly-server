/*globals $,store,countlyGlobal,_,countlyVersionHistoryManager,T*/
$(document).ready(function() {
    whatsNewPopup();
});

/**
 * Document width check is a hack for certain cases like dashboard email screenshot process, in order not to show the popup
 */
function whatsNewPopup() {
    /*
        Document width check is a hack for certain cases like dashboard email
        screenshot process, in order not to show the popup
     */
    if (countlyVersionHistoryManager) {
        $.when(countlyVersionHistoryManager.initialize()).then(function() {

            var versionData = _.sortBy(countlyVersionHistoryManager.getData(), "updated");
            if (versionData && versionData.length) {
                var currentVersionData = versionData[versionData.length - 1];

                if (currentVersionData && currentVersionData.version && currentVersionData.version.split) {
                    // Current version string, e.g. 18.08
                    var currentVersion = currentVersionData.version.split(".");
                    currentVersion = currentVersion[0] + "." + currentVersion[1];

                    // If Drill is present it should be a Countly Enterprise instance
                    var isEE = (countlyGlobal.plugins.indexOf("drill") !== -1);

                    // disabled: true disables the entire popup
                    // isFirstTime: false disables opening the popup on load
                    // showInTopBar: false disabled adding a top bar icon
                    var displayParams = {
                        disabled: false,
                        isFirstTime: true,
                        showInTopBar: true
                    };

                    // Local storage data in {"version":"18.08","seen":1534765533775} format
                    var localStorageData = store.get("countly_onboard_whatsnew");

                    // Duration to show the top bar icon for the popup trigger (10 days)
                    var showInTopBarForMS = 10 * 24 * 60 * 60 * 1000;

                    var currentTimeMS = (new Date()).getTime();

                    // Popup HTML
                    var popupTemplate;


                    // User account was created after the version upgrade
                    // so we'll only show the top bar icon
                    if (countlyGlobal &&
                        countlyGlobal.member &&
                        countlyGlobal.member.created_at &&
                        currentVersionData.updated < (countlyGlobal.member.created_at * 1000)
                    ) {
                        displayParams.isFirstTime = false;
                        displayParams.showInTopBar = true;
                    }

                    // If there is only one version data, user probably just
                    // installed Countly so we won't show a what's new popup
                    // if (versionData.length <= 1) {
                    //    displayParams.disabled = true;
                    // }
                    //
                    // LOGIC DISABLED FOR NOW BECAUSE VERSION DATA WILL INCLUDE 1 ITEM FOR ALL SERVERS

                    if (!displayParams.disabled && !(countlyGlobal && countlyGlobal.ssr)) {

                        if (localStorageData && localStorageData.version && localStorageData.seen && localStorageData.version.indexOf(currentVersion) === 0) {
                            // Since LS object is present for this version
                            // user has seen the popup before so we won't show it on load
                            displayParams.isFirstTime = false;

                            // If it has been more than showInTopBarForMS since the user
                            // first seen the popup, we'll not show the icon in top bar
                            if ((currentTimeMS - localStorageData.seen) > showInTopBarForMS) {
                                displayParams.showInTopBar = false;
                            }
                        }
                        else {
                            store.set("countly_onboard_whatsnew", {
                                version: currentVersion,
                                seen: currentTimeMS
                            });
                        }

                        // First we fetch the json file that contains the new features for this version
                        $.when($.get(countlyGlobal.path + '/onboarding/data/versions/' + currentVersion + '/features.json', function(featuresJSON) {

                            if (!isEE) {
                                // If this is not an EE instance we look for CE features in the
                                // features array, if we can't find anything we won't show the popup
                                featuresJSON = _.filter(featuresJSON, function(feature) {
                                    return feature.showIn === "CE" || feature.showIn === "All";
                                });
                            }
                            else {
                                featuresJSON = _.filter(featuresJSON, function(feature) {
                                    return feature.showIn === "EE" || feature.showIn === "All";
                                });
                            }

                            // If there aren't any features to show, disable popup logic completely
                            displayParams.disabled = (featuresJSON.length === 0 || !_.isArray(featuresJSON));

                            var popupData = {
                                features: featuresJSON,
                                version: currentVersion
                            };

                            if (!displayParams.disabled) {
                                $.when(T.render('/onboarding/templates/whatsnew-popup.html', function(popupHTML) {

                                    popupTemplate = popupHTML;
                                    popupTemplate = popupTemplate(popupData);

                                    // Only show the popup on load for the first time
                                    if (displayParams.isFirstTime) {
                                        openPopup();
                                    }

                                    // Attach the gift icon to the top bar if it's not already
                                    // there and user meets the conditions to see it
                                    if (displayParams.showInTopBar && $("#top-bar").find("#whatsnew-menu").length === 0) {
                                        var whatsnewTopBarMenu =
                                            '<div id="whatsnew-menu" class="dropdown icon" style="display: block">' +
                                            '<div class="empty-state">' +
                                            '<i class="fa fa-gift" title="You can access the new features popup from here for the next 10 days"></i>' +
                                            '</div>' +
                                            '</div>';

                                        if (!store.get('first_app')) {
                                            $("#top-bar").find(".right-menu").prepend(whatsnewTopBarMenu);
                                        }

                                        // Initialize the tooltip which will be shown only
                                        // when the user closes the popup after first view
                                        $("#whatsnew-menu i").tooltipster({
                                            animation: 'fade',
                                            animationDuration: 100,
                                            delay: 100,
                                            maxWidth: 240,
                                            theme: 'tooltipster-borderless',
                                            trigger: 'custom',
                                            triggerOpen: {
                                                mouseenter: false,
                                                touchstart: false
                                            },
                                            triggerClose: {
                                                mouseleave: false,
                                                touchleave: false,
                                                originClick: true
                                            },
                                            side: "bottom"
                                        });
                                    }

                                    $(document).on("click", "#whatsnew-popup-close", function() {
                                        closePopup();
                                    });

                                    $(document).on("click", "#last-step-button", function() {
                                        closePopup();
                                    });

                                    $(document).keyup(function(e) {
                                        // Close the popup with ESC
                                        if (e.keyCode === 27) {
                                            closePopup();
                                        }
                                    });

                                    $(document).on("click", "#whatsnew-explore", function() {
                                        $("#whatsnew-first-time").fadeOut();
                                    });

                                    $("#whatsnew-menu").on("click", function() {
                                        openPopup();
                                    });

                                    /**
                                    * Open Popup
                                    */
                                    function openPopup() {
                                        $("body").append(popupTemplate);
                                        $("#whatsnew-overlay").addClass("active");

                                        if (displayParams.isFirstTime) {
                                            setTimeout(function() {
                                                $("#whatsnew-popup").addClass("show");
                                            }, 300);
                                        }
                                        else {
                                            // If it's not the first time, we won't show the
                                            // info view to initiate the carousel
                                            $("#whatsnew-first-time").hide();

                                            setTimeout(function() {
                                                $("#whatsnew-popup").addClass("show");
                                            }, 0);
                                        }
                                    }

                                    /**
                                    * Close Popup
                                    */
                                    function closePopup() {
                                        $("#whatsnew-overlay").removeClass("active");
                                        $("#whatsnew-popup").removeClass("show");

                                        setTimeout(function() {
                                            $("#whatsnew").hide();
                                        }, 500);

                                        setTimeout(function() {
                                            $("#whatsnew").remove();
                                        }, 800);

                                        if (displayParams.isFirstTime && displayParams.showInTopBar) {
                                            setTimeout(function() {
                                                $("#whatsnew-menu i").tooltipster('open');
                                            }, 300);

                                            setTimeout(function() {
                                                $("#whatsnew-menu i").tooltipster('close');
                                            }, 5000);

                                            displayParams.isFirstTime = false;
                                        }
                                    }

                                })).then(function() {});
                            }
                        })).then(function() {});
                    }
                }
            }
        });
    }
}