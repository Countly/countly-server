/* global countlyCommon, countlyEvent, $, Backbone, app, CountlyHelpers, _, Handlebars */

var initializeOnce = _.once(function() {
    return $.when(countlyEvent.initialize()).then(function() { });
});

/**
* Default Backbone View template from which all countly views should inherit.
* A countly view is defined as a page corresponding to a url fragment such
* as #/manage/apps. This interface defines common functions or properties
* the view object has. A view may override any function or property.
* @name countlyView
* @global
* @namespace countlyView
* @example <caption>Extending default view and overwriting its methods</caption>
*  window.DashboardView = countlyView.extend({
*       renderCommon:function () {
*           if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID]){
*               var type = countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type;
*               type = jQuery.i18n.map["management-applications.types."+type] || type;
*               $(this.el).html("<div id='no-app-type'><h1>"+jQuery.i18n.map["common.missing-type"]+": "+type+"</h1></div>");
*           }
*           else{
*               $(this.el).html("<div id='no-app-type'><h1>"+jQuery.i18n.map["management-applications.no-app-warning"]+"</h1></div>");
*           }
*       }
*   });
*/
window.countlyView = Backbone.View.extend({
    /**
    * Checking state of view, if it is loaded
    * @type {boolean}
    * @instance
    * @memberof countlyView
    */
    isLoaded: false,
    /**
    * Handlebar template
    * @type {object}
    * @instance
    * @memberof countlyView
    */
    template: null, //handlebars template of the view
    /**
    * Data to pass to Handlebar template when building it
    * @type {object}
    * @instance
    * @memberof countlyView
    */
    templateData: {}, //data to be used while rendering the template
    /**
    * Main container which contents to replace by compiled template
    * @type {jquery_object}
    * @instance
    * @memberof countlyView
    */
    el: $('#content'), //jquery element to render view into
    _myRequests: {}, //save requests called for this view
    /**
    * Initialize view, overwrite it with at least empty function if you are using some custom remote template
    * @memberof countlyView
    * @instance
    */
    initialize: function() { //compile view template
        this.template = Handlebars.compile($("#template-analytics-common").html());
    },
    _removeMyRequests: function() {
        for (var url in this._myRequests) {
            for (var data in this._myRequests[url]) {
                //4 means done, less still in progress
                if (parseInt(this._myRequests[url][data].readyState, 10) !== 4) {
                    this._myRequests[url][data].abort_reason = "app_remove_reqs";
                    this._myRequests[url][data].abort();
                }
            }
        }
        this._myRequests = {};
    },
    /**
    * This method is called when date is changed, default behavior is to call refresh method of the view
    * @memberof countlyView
    * @instance
    */
    dateChanged: function() { //called when user changes the date selected
        if (Backbone.history.fragment === "/") {
            this.refresh(true);
        }
        else {
            this.refresh();
        }
    },
    /**
    * This method is called when app is changed, default behavior is to reset preloaded data as events
    * @param {function=} callback  - callback function
    * @memberof countlyView
    * @instance
    */
    appChanged: function(callback) { //called when user changes selected app from the sidebar
        countlyEvent.reset();
        $.when(countlyEvent.initialize()).always(function() {
            if (callback) {
                callback();
            }
        });
    },
    /**
    * This method is called before calling render, load your data and remote template if needed here
    * @returns {boolean} true
    * @memberof countlyView
    * @instance
    * @example
    *beforeRender: function() {
    *   var self = this;
    *   return $.when(T.render('/density/templates/density.html', function(src){
    *       self.template = src;
    *   }), countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("densities"), countlyDensity.initialize()).then(function () {});
    *}
    */
    beforeRender: function() {
        return true;
    },
    /**
    * This method is called after calling render method
    * @memberof countlyView
    * @instance
    */
    afterRender: function() {
        CountlyHelpers.makeSelectNative();
    },
    /**
    * Main render method, better not to over write it, but use {@link countlyView.renderCommon} instead
    * @returns {object} this
    * @memberof countlyView
    * @instance
    */
    render: function() { //backbone.js view render function
        // var currLink = Backbone.history.fragment;

        // // Reset any active views and dropdowns
        // $("#main-views-container").find(".main-view").removeClass("active");
        // $("#top-bar").find(".dropdown.active").removeClass("active");

        // // Activate the main view and dropdown based on the active view
        // if (/^\/custom/.test(currLink) === true) {
        //     $("#dashboards-main-view").addClass("active");
        //     $("#dashboard-selection").addClass("active");
        // }
        // else {
        //     $("#analytics-main-view").addClass("active");
        //     $("#app-navigation").addClass("active");
        // }

        $("#content-top").html("");
        this.el.html('');

        if (countlyCommon.ACTIVE_APP_ID) {
            var self = this;
            $.when(this.beforeRender(), initializeOnce()).fail(function(XMLHttpRequest, textStatus, errorThrown) {
                if (XMLHttpRequest && XMLHttpRequest.status === 0) {
                    // eslint-disable-next-line no-console
                    console.error("Check Your Network Connection");
                }
                else if (XMLHttpRequest && XMLHttpRequest.status === 404) {
                    // eslint-disable-next-line no-console
                    console.error("Requested URL not found: " + XMLHttpRequest.my_set_url + " with " + JSON.stringify(XMLHttpRequest.my_set_data));
                }
                else if (XMLHttpRequest && XMLHttpRequest.status === 500) {
                    // eslint-disable-next-line no-console
                    console.error("Internel Server Error: " + XMLHttpRequest.my_set_url + " with " + JSON.stringify(XMLHttpRequest.my_set_data));
                }
                else if ((XMLHttpRequest && typeof XMLHttpRequest.status === "undefined") || errorThrown) {
                    // eslint-disable-next-line no-console
                    console.error("Unknow Error: ");
                    if (XMLHttpRequest) {
                        // eslint-disable-next-line no-console
                        console.log(XMLHttpRequest.my_set_url + " with " + JSON.stringify(XMLHttpRequest.my_set_data) + "\n" + (XMLHttpRequest.responseText) + "\n");
                    }
                    // eslint-disable-next-line no-console
                    console.error(textStatus + "\n" + errorThrown);
                }
            })
                .always(function() {
                    if (app.activeView === self) {
                        self.isLoaded = true;
                        self.renderCommon();
                        self.afterRender();
                        app.pageScript();
                    }
                });
        }
        else {
            if (app.activeView === this) {
                this.isLoaded = true;
                this.renderCommon();
                this.afterRender();
                app.pageScript();
            }
        }

        /*
        Vue update - remove following
        if (countlyGlobal.member.member_image) {
            $('.member_image').html("");
            $('.member_image').css({'background-image': 'url(' + countlyGlobal.member.member_image + '?now=' + Date.now() + ')', 'background-size': '100%'});
        }
        else {
            var defaultAvatarSelector = countlyGlobal.member.created_at % 16 * 30;
            var name = countlyGlobal.member.full_name.split(" ");
            $('.member_image').css({'background-image': 'url("images/avatar-sprite.png")', 'background-position': defaultAvatarSelector + 'px', 'background-size': '510px 30px', 'text-align': 'center'});
            $('.member_image').html("");
            $('.member_image').prepend('<span style="text-style: uppercase;color: white;position: relative; top: 6px; font-size: 16px;">' + name[0][0] + name[name.length - 1][0] + '</span>');
        }
        // Top bar dropdowns are hidden by default, fade them in when view render is complete
        $("#top-bar").find(".dropdown").fadeIn(2000);
        */

        return this;
    },
    /**
    * Do all your rendering in this method
    * @param {boolean} isRefresh - render is called from refresh method, so do not need to do initialization
    * @memberof countlyView
    * @instance
    * @example
    *renderCommon:function (isRefresh) {
    *    //set initial data for template
    *    this.templateData = {
    *        "page-title":jQuery.i18n.map["density.title"],
    *        "logo-class":"densities",
    *        "chartHTML": chartHTML,
    *    };
    *
    *    if (!isRefresh) {
    *        //populate template with data and add to html
    *        $(this.el).html(this.template(this.templateData));
    *    }
    *}
    */
    renderCommon: function(/* isRefresh*/) {}, // common render function of the view
    /**
    * Called when view is refreshed, you can reload data here or call {@link countlyView.renderCommon} with parameter true for code reusability
    * @returns {boolean} true
    * @memberof countlyView
    * @instance
    * @example
    * refresh:function () {
    *    var self = this;
    *    //reload data from beforeRender method
    *    $.when(this.beforeRender()).then(function () {
    *        if (app.activeView != self) {
    *            return false;
    *        }
    *        //re render data again
    *        self.renderCommon(true);
    *
    *        //replace some parts manually from templateData
    *        var newPage = $("<div>" + self.template(self.templateData) + "</div>");
    *        $(self.el).find(".widget-content").replaceWith(newPage.find(".widget-content"));
    *        $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
    *        $(self.el).find(".density-widget").replaceWith(newPage.find(".density-widget"));
    *    });
    *}
    */
    refresh: function() { // resfresh function for the view called every 10 seconds by default
        return true;
    },
    /**
    * This method is called when user is active after idle period
    * @memberof countlyView
    * @instance
    */
    restart: function() { // triggered when user is active after idle period
        this.refresh();
    },
    /**
    * This method is called when view is destroyed (user entered inactive state or switched to other view) you can clean up here if there is anything to be cleaned
    * @memberof countlyView
    * @instance
    */
    destroy: function() { }
});
