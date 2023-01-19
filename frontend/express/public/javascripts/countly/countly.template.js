/* global Backbone, countlyAuth, Handlebars, countlyEvent, countlyCommon, countlyGlobal, countlyView, CountlyHelpers, countlySession, moment, Drop, _, store, countlyLocation, jQuery, $, T, countlyVue*/
/**
 * View class to expand by plugins which need configuration under Management->Applications.
 * @name countlyManagementView
 * @global
 * @namespace countlyManagementView
 */
window.countlyManagementView = countlyView.extend({
    /**
     * Handy function which returns currently saved configuration of this plugin or empty object.
     * @memberof countlyManagementView
     * @return {Object} app object
     */
    config: function() {
        return countlyGlobal.apps[this.appId] &&
            countlyGlobal.apps[this.appId].plugins &&
            countlyGlobal.apps[this.appId].plugins[this.plugin] || {};
    },

    /**
     * Set current app id
     * @memberof countlyManagementView
     * @param {string} appId - app Id to set
     */
    setAppId: function(appId) {
        if (appId !== this.appId) {
            this.appId = appId;
            this.resetTemplateData();
            this.savedTemplateData = JSON.stringify(this.templateData);
        }
    },

    /**
     * Reset template data when changing app
     * @memberof countlyManagementView
     */
    resetTemplateData: function() {
        this.templateData = {};
    },

    /**
     * Title of plugin configuration tab, override with your own title.
     * @memberof countlyManagementView
     * @return {String} tab title
     */
    titleString: function() {
        return 'Default plugin configuration';
    },

    /**
     * Saving string displayed when request takes more than 0.3 seconds, override if needed.
     * @memberof countlyManagementView
     * @return {String} saving string
     */
    savingString: function() {
        return 'Saving...';
    },

    /**
     * Callback function called before tab is expanded. Override if needed.
     * @memberof countlyManagementView
     */
    beforeExpand: function() {},

    /**
     * Callback function called after tab is collapsed. Override if needed.
     * @memberof countlyManagementView
     */
    afterCollapse: function() {},

    /**
     * Function used to determine whether save button should be visible. Used whenever UI is redrawn or some value changed. Override if needed.
     * @memberof countlyManagementView
     * @return {Boolean} true if enabled
     */
    isSaveAvailable: function() {
        return JSON.stringify(this.templateData) !== this.savedTemplateData.toString();
    },

    /**
     * Callback function called to apply changes. Override if validation is needed.
     * @memberof countlyManagementView
     * @return {String} error to display to user if validation didn't pass
     */
    validate: function() {
        return null;
    },

    /**
     * Function which prepares data to the format required by the server, must return a Promise.
     * @memberof countlyManagementView
     * @return {Promise} which resolves to object of {plugin-name: {config: true, options: true}} format or rejects with error string otherwise
     */
    prepare: function() {
        var o = {}; o[this.plugin] = this.templateData; return $.when(o);
    },

    /**
     * Show error message returned by server or by validate function. Override if needed.
     * @memberof countlyManagementView
     * @param {string} error - error message to show
     */
    showError: function(error) {
        CountlyHelpers.alert(error, 'popStyleGreen', {title: jQuery.i18n.map['management-applications.plugins.smth'], image: 'empty-icon', button_title: jQuery.i18n.map['management-applications.plugins.ok']});
    },

    /**
     * Called whenever element value with name in parameter have been changed. Override if needed.
     * @memberof countlyManagementView
     */
    onChange: function(/* name */) { },

    /**
     * Called whenever element value with name in parameter have been changed.
     * @memberof countlyManagementView
     * @param {string} name - key
     * @param {string} value - value to set
     */
    doOnChange: function(name, value) {

        if (name && countlyCommon.dot(this.templateData, name) !== value) {
            countlyCommon.dot(this.templateData, name, value);
        }

        if (this.isSaveAvailable()) {
            this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').show();
        }
        else {
            this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').hide();
        }

        if (name) {
            this.onChange(name, value);
        }
    },

    /**
     * Save logic: validate, disable save button, submit to the server,
     * show loading dialog if it takes long enough, hide it when done, show error if any, enable save button.
     * @memberof countlyManagementView
     * @param {event} ev - event
     * @returns {object} error
     */
    save: function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').hasClass('disabled') || !this.isSaveAvailable()) {
            return;
        }

        var error = this.validate(), self = this;
        if (error) {
            return this.showError(error === true ? jQuery.i18n.map['management-applications.plugins.save.nothing'] : error);
        }

        this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').addClass('disabled');

        this.prepare().then(function(data) {
            var dialog, timeout = setTimeout(function() {
                dialog = CountlyHelpers.loading(jQuery.i18n.map['management-applications.plugins.saving']);
            }, 300);

            $.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.apps.w + '/update/plugins',
                data: {
                    app_id: self.appId,
                    args: JSON.stringify(data)
                },
                dataType: "json",
                success: function(result) {
                    self.el.parent().find("h3[aria-controls=" + self.el.attr("id") + "]").find('.icon-button').removeClass('disabled');
                    clearTimeout(timeout);
                    if (dialog) {
                        CountlyHelpers.removeDialog(dialog);
                    }
                    if (result.result === 'Nothing changed') {
                        CountlyHelpers.notify({type: 'warning', message: jQuery.i18n.map['management-applications.plugins.saved.nothing']});
                    }
                    else {
                        CountlyHelpers.notify({title: jQuery.i18n.map['management-applications.plugins.saved.title'], message: jQuery.i18n.map['management-applications.plugins.saved']});
                        if (!countlyGlobal.apps[result._id].plugins) {
                            countlyGlobal.apps[result._id].plugins = {};
                        }
                        self.savedTemplateData = JSON.stringify(self.templateData);
                        for (var k in result.plugins) {
                            countlyGlobal.apps[result._id].plugins[k] = result.plugins[k];
                        }
                        self.resetTemplateData();
                        self.render();
                    }
                    self.doOnChange();
                },
                error: function(resp) {
                    try {
                        resp = JSON.parse(resp.responseText);
                    }
                    catch (ignored) {
                        //ignored excep
                    }

                    self.el.parent().find("h3[aria-controls=" + self.el.attr("id") + "]").removeClass('disabled');
                    clearTimeout(timeout);
                    if (dialog) {
                        CountlyHelpers.removeDialog(dialog);
                    }
                    self.showError(resp.result || jQuery.i18n.map['management-applications.plugins.error.server']);
                }
            });
        }, function(error1) {
            self.el.parent().find("h3[aria-controls=" + self.el.attr("id") + "]").removeClass('disabled');
            self.showError(error1);
        });
    },

    beforeRender: function() {
        var self = this;
        if (this.templatePath && this.templatePath !== "") {
            return $.when(T.render(this.templatePath, function(src) {
                self.template = src;
            }));
        }
        else {
            return;
        }
    },

    render: function() { //backbone.js view render function
        var self = this;

        if (!this.savedTemplateData) {
            this.savedTemplateData = JSON.stringify(this.templateData);
        }
        this.el.html(this.template(this.templateData));
        if (!this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').length) {
            setTimeout(function() {
                $('<a class="icon-button green" data-localize="management-applications.plugins.save" href="#">Save</a>').hide().appendTo(self.el.parent().find("h3[aria-controls=" + self.el.attr("id") + "]"));
            });

        }

        this.el.find('.cly-select').each(function(i, select) {
            $(select).off('click', '.item').on('click', '.item', function() {
                self.doOnChange($(select).data('name') || $(select).attr('id'), $(this).data('value'));
            });
        });

        this.el.find(' input[type=number]').off('input').on('input', function() {
            self.doOnChange($(this).attr('name') || $(this).attr('id'), parseFloat($(this).val()));
        });

        this.el.find('input[type=text], input[type=password]').off('input').on('input', function() {
            self.doOnChange($(this).attr('name') || $(this).attr('id'), $(this).val());
        });

        this.el.find('input[type=file]').off('change').on('change', function() {
            self.doOnChange($(this).attr('name') || $(this).attr('id'), $(this).val());
        });

        this.el.find('.on-off-switch input').on("change", function() {
            var isChecked = $(this).is(":checked"),
                attrID = $(this).attr("id");
            self.doOnChange(attrID, isChecked);
        });

        setTimeout(function() {
            self.el.parent().find("h3[aria-controls=" + self.el.attr("id") + "]").find('.icon-button').off('click').on('click', self.save.bind(self));
        });
        if (this.isSaveAvailable()) {
            this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').show();
        }
        else {
            this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').hide();
        }

        app.localize();

        this.afterRender();

        return this;
    },
});

/**
* Drop class with embeded countly theme, use as any Drop class/instance
* @name CountlyDrop
* @global
* @namespace CountlyDrop
*/
var CountlyDrop = Drop.createContext({
    classPrefix: 'countly-drop',
});

//redefine contains selector for jquery to be case insensitive
$.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function(elem) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});

/**
* Set menu items by restriction status, hiding empty menu-categories
* @name setMenuItems
* @global
*/
function setMenuItems() {
    // hide empty section headers
    var type = countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type ? countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type : "mobile";
    var categories = $('#' + type + '-type .menu-category');
    for (var j = 0; j < categories.length; j++) {
        var children = categories[j].children;
        var isEmpty = true;
        for (var k = 0; k < children.length; k++) {
            if (children[k].className.indexOf('restrict') === -1 && children[k].className.indexOf('item') !== -1) {
                isEmpty = false;
            }
        }
        if (isEmpty) {
            $(categories[j]).hide();
        }
        else {
            $(categories[j]).show();
        }
    }
}

/**
 * Main app instance of Backbone AppRouter used to control views and view change flow
 * @name app
 * @global
 * @instance
 * @namespace app
 */
var AppRouter = Backbone.Router.extend({
    routes: {
        "/": "dashboard",
        "*path": "main"
    },
    /**
    * View that is currently being displayed
    * @type {countlyView}
    * @instance
    * @memberof app
    */
    activeView: null, //current view
    dateToSelected: null, //date to selected from the date picker
    dateFromSelected: null, //date from selected from the date picker
    activeAppName: '',
    activeAppKey: '',
    _isFirstLoad: false, //to know if we are switching between two apps or just loading page
    refreshActiveView: 0, //refresh interval function reference
    _myRequests: {}, //save requests not connected with view to prevent calling the same if previous not finished yet.
    /**
    * Navigate to another view programmatically. If you need to change the view without user clicking anything, like redirect. You can do this using this method. This method is not define by countly but is direct method of AppRouter object in Backbone js
    * @name app#navigate
    * @function
    * @instance
    * @param {string} fragment - url path (hash part) where to redirect user
    * @param {boolean=} triggerRoute - to trigger route call, like initialize new view, etc. Default is false, so you may want to use false when redirecting to URL for your own same view where you are already, so no need to reload it
    * @memberof app
    * @example <caption>Redirect to url of the same view</caption>
    * //you are at #/manage/systemlogs
    * app.navigate("#/manage/systemlogs/query/{}");
    *
    * @example <caption>Redirect to url of other view</caption>
    * //you are at #/manage/systemlogs
    * app.navigate("#/crashes", true);
    */
    _removeUnfinishedRequests: function() {
        for (var url in this._myRequests) {
            for (var data in this._myRequests[url]) {
                //4 means done, less still in progress
                if (parseInt(this._myRequests[url][data].readyState) !== 4) {
                    this._myRequests[url][data].abort_reason = "view_change";
                    this._myRequests[url][data].abort();
                }
            }
        }
        this._myRequests = {};
        if (this.activeView) {
            this.activeView._removeMyRequests();//remove requests for view(if not finished)
        }
    },
    switchApp: function(app_id, callback) {
        countlyCommon.setActiveApp(app_id);
        $("#active-app-name").text(countlyGlobal.apps[app_id].name);
        $("#active-app-name").attr('title', countlyGlobal.apps[app_id].name);
        $("#active-app-icon").css("background-image", "url('" + countlyGlobal.path + "appimages/" + app_id + ".png')");

        //removing requests saved in app
        app._removeUnfinishedRequests();
        if (app && app.activeView) {
            if (typeof callback === "function") {
                app.activeView.appChanged(function() {
                    app.onAppSwitch(app_id);
                    callback();
                });
            }
            else {
                app.activeView.appChanged(function() {
                    app.onAppSwitch(app_id);
                });
            }
        }
        else {
            if (typeof callback === "function") {
                callback();
            }
        }
    },
    _menuForTypes: {},
    _subMenuForTypes: {},
    _menuForAllTypes: [],
    _subMenuForAllTypes: [],
    _subMenuForCodes: {},
    _subMenus: {},
    _internalMenuCategories: ["management", "user"],
    _uniqueMenus: {},
    /**
    * Add menu category. Categories will be copied for all app types and its visibility should be controled from the app type plugin
    * @memberof app
    * @param {string} category - new menu category
    * @param {Object} node - object defining category lement
    * @param {string} node.text - key for localization string which to use as text
    * @param {number} node.priority - priority order number, the less it is, the more on top category will be
    * @param {string} node.classes - string with css classes to add to category element
    * @param {string} node.style - string with css styling to add to category element
    * @param {string} node.html - additional HTML to append after text
    * @param {function} node.callback - called when and each time category is added passing same parameters as to this method plus added jquery category element as 3th param
    **/
    addMenuCategory: function(category, node) {
        if (this._internalMenuCategories.indexOf(category) !== -1) {
            throw "Category already exists with name: " + category;
        }
        if (typeof node.priority === "undefined") {
            throw "Provide priority property for category element";
        }

        //New sidebar container hook
        countlyVue.container.registerData("/sidebar/analytics/menuCategory", {
            name: category,
            priority: node.priority,
            title: node.text || countlyVue.i18n("sidebar.category." + category),
            node: node
            /*
                Following secondary params are simply passed to registry, but not directly used for now:

                * node.classes - string with css classes to add to category element
                * node.style - string with css styling to add to category element
                * node.html - additional HTML to append after text
                * node.callback 
            */
        });

        var menu = $("<div></div>");
        menu.addClass("menu-category");
        menu.addClass(category + "-category");
        menu.attr("data-priority", node.priority);
        if (node.classes) {
            menu.addClass(node.classes);
        }
        if (node.style) {
            menu.attr("style", node.style);
        }
        menu.append('<span class="menu-category-title" data-localize="' + (node.text || "sidebar.category." + category) + '"></span>');
        if (node.html) {
            menu.append(node.html);
        }
        this._internalMenuCategories.push(category);
        var added = false;
        var selector = "#sidebar-menu .sidebar-menu";
        //try adding before first greater priority
        $(selector + " > div.menu-category").each(function() {
            var cur = parseInt($(this).attr("data-priority"));
            if (node.priority < cur) {
                added = true;
                $(this).before(menu);
                return false;
            }
        });

        //if not added, maybe we are first or last, so just add it
        if (!added) {
            $(selector).append(menu);
        }
        if (typeof node.callback === "function") {
            node.callback(category, node, menu);
        }
    },
    /**
    * Add first level menu element for specific app type under specified category. You can only add app type specific menu to categories "understand", "explore", "reach", "improve", "utilities"
    * @memberof app
    * @param {string} app_type - type of the app for which to add menu
    * @param {string} category - category under which to add menu: "understand", "explore", "reach", "improve", "utilities"
    * @param {Object} node - object defining menu lement
    * @param {string} node.text - key for localization string which to use as text
    * @param {string} node.code - code name for menu to reference for children, also assigned as id attribute with -menu postfix
    * @param {string} node.icon - HTML code for icon to show, usually a div element with font icon classes
    * @param {number} node.priority - priority order number, the less it is, the more on top menu will be
    * @param {string} node.url - url where menu points. Don't provide this, if it is upper menu and will contain children
    * @param {string} node.classes - string with css classes to add to menu element
    * @param {string} node.style - string with css styling to add to menu element
    * @param {string} node.html - additional HTML to append after text (use icon to append HTML before text)
    * @param {function} node.callback - called when and each time menu is added passing same parameters as to this method plus added jquery menu element as 4th param
    **/
    addMenuForType: function(app_type, category, node) {
        if (this._internalMenuCategories.indexOf(category) === -1) {
            throw "Wrong category for menu: " + category;
        }
        if (!node.text || !node.code || typeof node.priority === "undefined") {
            throw "Provide code, text, icon and priority properties for menu element";
        }

        if (!this._uniqueMenus[app_type]) {
            this._uniqueMenus[app_type] = {};
        }

        if (!this._uniqueMenus[app_type][category]) {
            this._uniqueMenus[app_type][category] = {};
        }

        if (!this._uniqueMenus[app_type][category][node.code]) {
            this._uniqueMenus[app_type][category][node.code] = true;
        }
        else {
            //duplicate menu
            return;
        }

        //New sidebar container hook
        countlyVue.container.registerData("/sidebar/analytics/menu", {
            app_type: app_type,
            category: category,
            name: node.code,
            priority: node.priority,
            title: node.text,
            url: node.url,
            icon: node.icon,
            permission: node.permission,
            tabsPath: node.tabsPath,
            node: node
            /*
                Following secondary params are simply passed to registry, but not directly used for now:

                * node.classes - string with css classes to add to category element
                * node.style - string with css styling to add to category element
                * node.html - additional HTML to append after text
                * node.callback
            */
        });

        if (!this.appTypes[app_type] && category !== "management" && category !== "users") {
            //app type not yet register, queue
            if (!this._menuForTypes[app_type]) {
                this._menuForTypes[app_type] = [];
            }
            this._menuForTypes[app_type].push({category: category, node: node});
            return;
        }
        //create menu element
        var menu = $("<a></a>");
        menu.addClass("item");
        menu.attr("data-priority", node.priority);
        menu.attr("id", node.code + "-menu");
        if (node.url) {
            menu.attr("href", node.url);
        }
        if (node.classes) {
            menu.addClass(node.classes);
        }
        if (node.style) {
            menu.attr("style", node.style);
        }
        menu.append(node.icon);
        menu.append('<div class="text" data-localize="' + node.text + '">' + (jQuery.i18n.map[node.text] || node.text) + '</div>');
        if (node.html) {
            menu.append(node.html);
        }

        if (!node.url && category !== "management" && category !== "users") {
            this._subMenus[node.code] = true;
            menu.hide();
            menu = menu.add('<div class="sidebar-submenu" id="' + node.code + '-submenu">');
        }
        var added = false;
        var selector = "#sidebar-menu #" + app_type + "-type ." + category + "-category";
        if (category === "management") {
            //different selector for management menu
            selector = ".right-menu #manage-menu";
        }
        else if (category === "users") {
            //different selector for users menu
            selector = ".right-menu #user-menu";
        }
        //try adding before first greater priority
        $(selector + " > a").each(function() {
            var cur = parseInt($(this).attr("data-priority"));
            if (node.priority < cur) {
                added = true;
                $(this).before(menu);
                return false;
            }
        });

        if (category === "management" && $(selector + " > a").length > 5) {
            $(selector).addClass("columns");
        }

        //if not added, maybe we are first or last, so just add it
        if (!added) {
            $(selector).append(menu);
        }

        if (typeof node.callback === "function") {
            node.callback(app_type, category, node, menu);
        }

        //run all queued submenus for this parent
        if (!node.url && category !== "management" && category !== "users" && this._subMenuForCodes[node.code]) {
            for (i = 0; i < this._subMenuForCodes[node.code].length; i++) {
                this.addSubMenuForType(this._subMenuForCodes[node.code][i].app_type, node.code, this._subMenuForCodes[node.code][i].node);
            }
            this._subMenuForCodes[node.code] = null;
        }
        setMenuItems();
    },
    /**
    * Add second level menu element for specific app type under specified parent code.
    * @memberof app
    * @param {string} app_type - type of the app for which to add menu
    * @param {string} parent_code - code for parent element under which to add this submenu element
    * @param {Object} node - object defining menu lement
    * @param {string} node.text - key for localization string which to use as text
    * @param {string} node.code - code name for menu to reference for children, also assigned as id attribute with -menu postfix
    * @param {number} node.priority - priority order number, the less it is, the more on top menu will be
    * @param {string} node.url - url where menu points. Don't provide this, if it is upper menu and will contain children
    * @param {string} node.classes - string with css classes to add to menu element
    * @param {string} node.style - string with css styling to add to menu element
    * @param {string} node.html - additional HTML to append after text (use icon to append HTML before text)
    * @param {function} node.callback - called when and each time menu is added passing same parameters as to this method plus added jquery menu element as 4th param
    **/
    addSubMenuForType: function(app_type, parent_code, node) {
        if (!parent_code) {
            throw "Provide code name for parent category";
        }
        if (!node.text || !node.code || !node.url || !node.priority) {
            throw "Provide text, code, url and priority for sub menu";
        }

        if (!this._uniqueMenus[app_type]) {
            this._uniqueMenus[app_type] = {};
        }

        if (!this._uniqueMenus[app_type][parent_code]) {
            this._uniqueMenus[app_type][parent_code] = {};
        }

        if (!this._uniqueMenus[app_type][parent_code][node.code]) {
            this._uniqueMenus[app_type][parent_code][node.code] = true;
        }
        else {
            //duplicate menu
            return;
        }

        //New sidebar container hook
        countlyVue.container.registerData("/sidebar/analytics/submenu", {
            app_type: app_type,
            parent_code: parent_code,
            name: node.code,
            priority: node.priority,
            title: node.text,
            url: node.url,
            permission: node.permission,
            tabsPath: node.tabsPath,
            node: node
            /*
                Following secondary params are simply passed to registry, but not directly used for now:

                * node.classes - string with css classes to add to category element
                * node.style - string with css styling to add to category element
                * node.html - additional HTML to append after text
                * node.callback
            */
        });

        if (!this.appTypes[app_type]) {
            //app type not yet register, queue
            if (!this._subMenuForTypes[app_type]) {
                this._subMenuForTypes[app_type] = [];
            }
            this._subMenuForTypes[app_type].push({parent_code: parent_code, node: node});
            return;
        }
        if (!this._subMenus[parent_code]) {
            //parent not yet registered, queue
            if (!this._subMenuForCodes[parent_code]) {
                this._subMenuForCodes[parent_code] = [];
            }
            this._subMenuForCodes[parent_code].push({app_type: app_type, node: node});
            return;
        }

        //create menu element
        var menu = $("<a></a>");
        menu.addClass("item");
        menu.attr("data-priority", node.priority);
        menu.attr("id", node.code + "-menu");
        menu.attr("href", node.url);
        if (node.classes) {
            menu.addClass(node.classes);
        }
        if (node.style) {
            menu.attr("style", node.style);
        }
        menu.append('<div class="text" data-localize="' + node.text + '">' + (jQuery.i18n.map[node.text] || node.text) + '</div>');
        if (node.html) {
            menu.append(node.html);
        }
        var added = false;
        //try adding before first greater priority
        $("#sidebar-menu #" + app_type + "-type #" + parent_code + "-submenu > a").each(function() {
            var cur = parseInt($(this).attr("data-priority"));
            if (node.priority < cur) {
                added = true;
                $(this).before(menu);
                return false;
            }
        });

        //if not added, maybe we are first or last, so just add it
        if (!added) {
            $("#sidebar-menu #" + app_type + "-type #" + parent_code + "-submenu").append(menu);
        }

        if ($("#sidebar-menu #" + app_type + "-type #" + parent_code + "-submenu > a").length === 1) {
            $("#sidebar-menu #" + app_type + "-type #" + parent_code + "-menu").attr("href", node.url);
        }
        else {
            $("#sidebar-menu #" + app_type + "-type #" + parent_code + "-menu").removeAttr("href");
        }

        $("#sidebar-menu #" + app_type + "-type #" + parent_code + "-menu").css('display', 'block');

        if (typeof node.callback === "function") {
            node.callback(app_type, parent_code, node, menu);
        }
    },
    /**
    * Add first level menu element for all app types and special categories. 
    * @memberof app
    * @param {string} category - category under which to add menu: "understand", "explore", "reach", "improve", "utilities", "management", "user"
    * @param {Object} node - object defining menu lement
    * @param {string} node.text - key for localization string which to use as text
    * @param {string} node.code - code name for menu to reference for children, also assigned as id attribute with -menu postfix
    * @param {string} node.icon - HTML code for icon to show, usually a div element with font icon classes
    * @param {number} node.priority - priority order number, the less it is, the more on top menu will be
    * @param {string} node.url - url where menu points. Don't provide this, if it is upper menu and will contain children
    * @param {string} node.classes - string with css classes to add to menu element
    * @param {string} node.style - string with css styling to add to menu element
    * @param {string} node.html - additional HTML to append after text (use icon to append HTML before text)
    * @param {function} node.callback - called when and each time menu is added passing same parameters as to this method plus added jquery menu element as 4th param
    **/
    addMenu: function(category, node) {
        if (node && (node.pluginName || node.permission) && !CountlyHelpers.isPluginEnabled(node.pluginName || node.permission)) {
            return;
        }
        else {
            if (category === "management" || category === "users") {
                this.addMenuForType("default", category, node);
            }
            else {
                for (var type in this.appTypes) {
                    this.addMenuForType(type, category, node);
                }
                //queue for future added app types
                this._menuForAllTypes.push({category: category, node: node});
            }
        }
    },
    /**
    * Add second level sub menu element for all app types (not available for special categories as "management" and "user")
    * @memberof app
    * @param {string} parent_code - code for parent element under which to add this submenu element
    * @param {Object} node - object defining menu lement
    * @param {string} node.text - key for localization string which to use as text
    * @param {string} node.code - code name for menu to reference for children, also assigned as id attribute with -menu postfix
    * @param {string} node.icon - HTML code for icon to show, usually a div element with font icon classes
    * @param {number} node.priority - priority order number, the less it is, the more on top menu will be
    * @param {string} node.url - url where menu points. Don't provide this, if it is upper menu and will contain children
    * @param {string} node.classes - string with css classes to add to menu element
    * @param {string} node.style - string with css styling to add to menu element
    * @param {string} node.html - additional HTML to append after text (use icon to append HTML before text)
    * @param {function} node.callback - called when and each time menu is added passing same parameters as to this method plus added jquery menu element as 4th param
    **/
    addSubMenu: function(parent_code, node) {
        if (node && (node.pluginName || node.permission) && !CountlyHelpers.isPluginEnabled(node.pluginName || node.permission)) {
            return;
        }
        else {
            for (var type in this.appTypes) {
                this.addSubMenuForType(type, parent_code, node);
            }
            //queue for future added app types
            this._subMenuForAllTypes.push({parent_code: parent_code, node: node});
        }
    },
    main: function(/*forced*/) {
        var change = true,
            redirect = false;
        // detect app switch like
        //#/app/586e32ddc32cb30a01558cc1/analytics/events
        if (Backbone.history.fragment.indexOf("/app/") === 0) {
            var app_id = Backbone.history.fragment.replace("/app/", "");
            redirect = "#/";
            if (app_id && app_id.length) {
                if (app_id.indexOf("/") !== -1) {
                    var parts = app_id.split("/");
                    app_id = parts.shift();
                    redirect = "#/" + parts.join("/");
                }
                if (app_id !== countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[app_id]) {
                    app.switchApp(app_id, function() {
                        app.navigate(redirect, true);
                    });
                    return;
                }
            }
        }
        else if (Backbone.history.fragment.indexOf("/0/") === 0 && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
            this.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment.replace("/0", ""), true);
            return;
        }
        else if (Backbone.history.fragment !== "/" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
            var type = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type || "mobile";
            var urls = countlyVue.container.getAllRoutes();
            urls.sort(function(a, b) {
                return b.url.length - a.url.length;
            });
            for (var i = 0; i < urls.length; i++) {
                if (urls[i].url === "#/") {
                    continue;
                }
                if ("#" + Backbone.history.fragment === urls[i].url && (type === urls[i].app_type || !urls[i].app_type)) {
                    change = false;
                    break;
                }
                else if (("#" + Backbone.history.fragment).indexOf(urls[i].url) === 0 && (type === urls[i].app_type || !urls[i].app_type)) {
                    redirect = urls[i].url;
                    break;
                }
            }
        }

        if (redirect) {
            app.navigate(redirect, true);
        }
        else if (change) {
            if (Backbone.history.fragment !== "/") {
                this.navigate("#/", true);
            }
            else if (countlyCommon.APP_NAMESPACE !== false) {
                this.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment, true);
            }
            else {
                this.dashboard();
            }
        }
        else {
            if (countlyCommon.APP_NAMESPACE !== false) {
                this.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment, true);
            }
            else {
                this.activeView.render();
            }
        }
    },
    dashboard: function() {
        if (countlyGlobal.member.restrict && countlyGlobal.member.restrict.indexOf("#/") !== -1) {
            return;
        }
        if (_.isEmpty(countlyGlobal.apps)) {
            this.renderWhenReady(this.manageAppsView);
        }
        else if (typeof this.appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type] !== "undefined") {
            if (this.appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type] !== null) {
                this.renderWhenReady(this.appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]);
            }
            else {
                this.renderWhenReady(app.HomeView);
            }
        }
        else {
            this.renderWhenReady(this.dashboardView);
        }
    },
    runRefreshScripts: function() {
        var i = 0;
        var l = 0;
        if (this.refreshScripts[Backbone.history.fragment]) {
            for (i = 0, l = this.refreshScripts[Backbone.history.fragment].length; i < l; i++) {
                this.refreshScripts[Backbone.history.fragment][i]();
            }
        }
        for (var k in this.refreshScripts) {
            if (k !== '#' && k.indexOf('#') !== -1 && Backbone.history.fragment.match("^" + k.replace(/#/g, '.*'))) {
                for (i = 0, l = this.refreshScripts[k].length; i < l; i++) {
                    this.refreshScripts[k][i]();
                }
            }
        }
        if (this.refreshScripts["#"]) {
            for (i = 0, l = this.refreshScripts["#"].length; i < l; i++) {
                this.refreshScripts["#"][i]();
            }
        }

    },
    performRefresh: function(self) {
        //refresh only if we are on current period
        if (countlyCommon.periodObj.periodContainsToday && self.activeView.isLoaded && !countlyCommon.DISABLE_AUTO_REFRESH) {
            self.activeView.isLoaded = false;
            $.when(self.activeView.refresh()).always(function() {
                self.activeView.isLoaded = true;
                self.runRefreshScripts();
            });
        }
    },
    renderWhenReady: function(viewName) { //all view renders end up here
        // If there is an active view call its destroy function to perform cleanups before a new view renders
        if (this.activeView && this.activeView.destroy) {
            this.activeView._removeMyRequests && this.activeView._removeMyRequests();
            this.activeView.destroy();
        }

        if (window.components && window.components.slider && window.components.slider.instance) {
            window.components.slider.instance.close();
        }

        this.activeView = viewName;

        clearInterval(this.refreshActiveView);
        if (typeof countlyGlobal.member.password_changed === "undefined") {
            countlyGlobal.member.password_changed = Math.round(new Date().getTime() / 1000);
        }
        this.routesHit++;

        if (_.isEmpty(countlyGlobal.apps)) {
            if (Backbone.history.fragment !== "/manage/apps") {
                this.navigate("/manage/apps", true);
            }
            else {
                viewName.render();
            }
            return false;
        }
        else if ((countlyGlobal.security.password_expiration > 0) &&
                (countlyGlobal.member.password_changed + countlyGlobal.security.password_expiration * 24 * 60 * 60 < new Date().getTime() / 1000) &&
                (!countlyGlobal.ssr)) {
            if (Backbone.history.fragment !== "/account-settings/reset") {
                this.navigate("/account-settings/reset", true);
            }
            else {
                viewName.render();
            }
            return false;
        }
        viewName.render();
        var self = this;
        this.refreshActiveView = setInterval(function() {
            self.performRefresh(self);
        }, countlyCommon.DASHBOARD_REFRESH_MS);

        if (countlyGlobal && countlyGlobal.message) {
            CountlyHelpers.parseAndShowMsg(countlyGlobal.message);
        }

        /**
         * Identify the actuve sidebar menu item.
         *
         * countlyVue.sideBarComponent is null on the initial load.
         * But don't worry, we identify selected menu items when its mounted aswell.
         */
        if (countlyVue.sideBarComponent) {
            countlyVue.sideBarComponent.$children[0].identifySelected();
        }
    },
    sidebar: {
        init: function() {
            setTimeout(function() {
                $("#sidebar-menu").find(".item").removeClass("active menu-active");
                $("#sidebar-menu").find(".menu-category-title").removeClass("active");
                var selectedMenu = $($("#sidebar-menu").find("a[href='#" + Backbone.history.fragment + "']"));

                if (!selectedMenu.length) {
                    var parts = Backbone.history.fragment.split("/");
                    selectedMenu = $($("#sidebar-menu").find("a[href='#/" + (parts[1] || "") + "']"));
                    if (!selectedMenu.length) {
                        selectedMenu = $($("#sidebar-menu").find("a[href='#/" + (parts[1] + "/" + parts[2] || "") + "']"));
                    }
                }

                var selectedSubmenu = selectedMenu.parents(".sidebar-submenu");

                if (selectedSubmenu.length) {
                    selectedMenu.addClass("active");
                    selectedSubmenu.prev().addClass("active menu-active");
                    app.sidebar.submenu.toggle(selectedSubmenu);
                }
                else {
                    selectedMenu.addClass("active");
                    app.sidebar.submenu.toggle();
                }

                var selectedCategory = selectedMenu.parents(".menu-category");
                if (selectedCategory.length) {
                    selectedCategory.find(".menu-category-title").addClass("active");
                }

                setMenuItems();
            }, 1000);
        },
        submenu: {
            toggle: function(el) {
                $(".sidebar-submenu").removeClass("half-visible");

                if (!el) {
                    $(".sidebar-submenu:visible").animate({ "right": "-170px" }, {
                        duration: 300,
                        easing: 'easeOutExpo',
                        complete: function() {
                            $(this).hide();
                        }
                    });
                    return true;
                }

                if (!el.is(":visible")) {
                    if ($(".sidebar-submenu").is(":visible")) {
                        $(".sidebar-submenu").hide();
                        el.css({ "right": "-110px" }).show().animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                        addText();
                    }
                    else {
                        el.css({ "right": "-170px" }).show().animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                        addText();
                    }
                }
                /** function add text to menu title */
                function addText() {
                    var mainMenuText = $(el.prev()[0]).find(".text").text();

                    $(".menu-title").remove();
                    var menuTitle = $("<div class='menu-title'></div>").text(mainMenuText).prepend("<i class='submenu-close ion-close'></i>");
                    el.prepend(menuTitle);

                    // Try setting submenu title once again if it was empty
                    // during previous try
                    if (!mainMenuText) {
                        setTimeout(function() {
                            $(".menu-title").text($(el.prev()[0]).find(".text").text());
                            $(".menu-title").prepend("<i class='submenu-close ion-close'></i>");
                        }, 1000);
                    }
                }
            }
        }
    },

    hasRoutingHistory: function() {
        if (this.routesHit > 1) {
            return true;
        }
        return false;
    },
    back: function(fallback_route) {
        if (this.routesHit > 1) {
            window.history.back();
        }
        else {
            var fragment = Backbone.history.getFragment();
            //route not passed, try  to guess from current location
            if (typeof fallback_route === "undefined" || fallback_route === "") {
                if (fragment) {
                    var parts = fragment.split("/");
                    if (parts.length > 1) {
                        fallback_route = "/" + parts[1];
                    }
                }
            }
            if (fallback_route === fragment) {
                fallback_route = '/';
            }
            this.navigate(fallback_route || '/', {trigger: true, replace: true});
        }
    },
    initialize: function() { //initialize the dashboard, register helpers etc.

        this.bind("route", function(name/*, args*/) {
            $('#content').removeClass(function(index, className) {
                return (className.match(/(^|\s)routename-\S*/g) || []).join(' ');
            }).addClass("routename-" + name);
        });

        this.appTypes = {};
        this.pageScripts = {};
        this.dataExports = {};
        this.appSwitchCallbacks = [];
        this.appManagementSwitchCallbacks = [];
        this.appObjectModificators = [];
        this.appManagementViews = {};
        this.appAddTypeCallbacks = [];
        this.userEditCallbacks = [];
        this.refreshScripts = {};
        this.appSettings = {};
        this.widgetCallbacks = {};
        var self = this;
        /**
            * Add menus
            **/
        self.addMenuCategory("understand", {priority: 10});
        self.addMenuCategory("explore", {priority: 20});
        self.addMenuCategory("reach", {priority: 30});
        self.addMenuCategory("improve", {priority: 40});
        self.addMenuCategory("utilities", {priority: 50});
        self.addMenu("understand", {code: "overview", url: "#/", text: "sidebar.home", icon: '<div class="logo dashboard ion-speedometer"></div>', priority: 10, bottom: 20});
        self.addMenu("understand", {code: "analytics", text: "sidebar.analytics", icon: '<div class="logo analytics ion-ios-pulse-strong"></div>', priority: 20});
        self.addMenu("understand", {code: "events", text: "sidebar.events", icon: '<div class="logo events"><i class="material-icons">bubble_chart</i></div>', priority: 40});
        // self.addMenu("understand", {code: "engagement", text: "sidebar.engagement", icon: '<div class="logo ion-happy-outline"></div>', priority: 30});
        self.addSubMenu("events", {code: "events-overview", permission: "events", url: "#/analytics/events/overview", text: "sidebar.events.overview", priority: 10});
        self.addSubMenu("events", {code: "all-events", permission: "events", url: "#/analytics/events", text: "sidebar.events.all-events", priority: 20});
        // if (countlyAuth.validateUpdate('events') || countlyAuth.validateDelete('events')) {
        //     self.addSubMenu("events", {code: "manage-events", url: "#/analytics/manage-events", text: "sidebar.events.blueprint", priority: 100});
        // }

        self.addMenu("utilities", {
            code: "management",
            text: "sidebar.utilities",
            icon: '<div class="logo management ion-wrench"></div>',
            priority: 10000000,
            callback: function(type, category, node, menu) {
                //for backwards compatability of old plugins adding menu to management
                menu.filter("#management-submenu").append("<span class='help-toggle'></span>");
            }
        });

        // if (countlyAuth.validateRead('core')) {
        //     self.addSubMenu("management", {code: "longtasks", url: "#/manage/tasks", text: "sidebar.management.longtasks", priority: 10});
        // }

        //management is also a menu category which goes in default menu i.e. visible to all users

        var jobsIconSvg = '<svg width="20px" height="16px" viewBox="0 0 12 10" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><title>list-24px 2</title><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="list-24px-2" fill="#9f9f9f" fill-rule="nonzero"><g id="list-24px"><path d="M0,6 L2,6 L2,4 L0,4 L0,6 Z M0,10 L2,10 L2,8 L0,8 L0,10 Z M0,2 L2,2 L2,0 L0,0 L0,2 Z M3,6 L12,6 L12,4 L3,4 L3,6 Z M3,10 L12,10 L12,8 L3,8 L3,10 Z M3,0 L3,2 L12,2 L12,0 L3,0 Z" id="Shape"></path></g></g></g></svg>';
        if (countlyAuth.validateAnyAppAdmin()) {
            self.addMenu("management", {code: "applications", url: "#/manage/apps", text: "sidebar.management.applications", icon: '<div class="logo-icon ion-ios-albums"></div>', priority: 20});
        }
        if (countlyAuth.validateGlobalAdmin()) {
            self.addMenu("management", {code: "users", url: "#/manage/users", text: "sidebar.management.users", icon: '<div class="logo-icon fa fa-user-friends"></div>', priority: 10});
        }
        if (countlyAuth.validateGlobalAdmin()) {
            self.addMenu("management", {code: "jobs", url: "#/manage/jobs", text: "sidebar.management.jobs", icon: '<div class="logo-icon">' + jobsIconSvg + '</div>', priority: 60});
        }

        // self.addMenu("management", {code: "help", text: "sidebar.management.help", icon: '<div class="logo-icon ion-help help"></div>', classes: "help-toggle", html: '<div class="on-off-switch" id="help-toggle"><input type="checkbox" class="on-off-switch-checkbox" id="help-toggle-cbox"><label class="on-off-switch-label" for="help-toggle-cbox"></label></div>', priority: 10000000});

        // self.addMenu("explore", {code: "users", text: "sidebar.analytics.users", icon: '<div class="logo ion-person-stalker"></div>', priority: 10});
        // self.addMenu("explore", {code: "behavior", text: "sidebar.behavior", icon: '<div class="logo ion-funnel"></div>', priority: 20});
        $(document).ready(function() {
            Backbone.history.checkUrl();
        });

        this.routesHit = 0; //keep count of number of routes handled by your application
        /**
        * When rendering data from server using templates from frontend/express/views we are using ejs as templating engine. But when rendering templates on the browser side remotely loaded templates through ajax, we are using Handlebars templating engine. While in ejs everything is simple and your templating code is basically javascript code betwee <% %> tags. Then with Handlebars it is not that straightforward and we need helper functions to have some common templating logic
        * @name Handlebars
        * @global
        * @instance
        * @namespace Handlebars
        */

        /**
        * Display common date selecting UI elements
        * @name date-selector
        * @memberof Handlebars
        * @example
        * {{> date-selector }}
        */
        Handlebars.registerPartial("date-selector", $("#template-date-selector").html());
        /**
        * Get id value from ObjectID string
        * @name getIdValue
        * @memberof Handlebars
        * @example
        * <span>{{#clearObjectId value}}{{/clearObjectId}}</span>
        */
        Handlebars.registerHelper('clearObjectId', function(object) {
            if (object) {
                var id = object._id;
                if (typeof id === "string") {
                    if (id.substr(0, 3) === "Obj") {
                        id = id.split("(")[1].split(")")[0];
                    }
                    return id;
                }
                else {
                    return "";
                }
            }
            else {
                return '';
            }
        });
        /**
        * Display common date time selecting UI elements
        * @name date-time-selector
        * @memberof Handlebars
        * @example
        * {{> date-time-selector }}
        */
        Handlebars.registerPartial("date-time-selector", $("#template-date-time-selector").html());
        /**
        * Display common timezone selecting UI element
        * @name timezones
        * @memberof Handlebars
        * @example
        * {{> timezones }}
        */
        Handlebars.registerPartial("timezones", $("#template-timezones").html() || "");
        /**
        * Display common app category selecting UI element
        * @name app-categories
        * @memberof Handlebars
        * @example
        * {{> app-categories }}
        */
        Handlebars.registerPartial("app-categories", $("#template-app-categories").html());
        /**
        * Iterate object with keys and values, creating variable "property" for object key and variable "value" for object value
        * @name eachOfObject
        * @memberof Handlebars
        * @example
        * {{#eachOfObject app_types}}
        *   <div data-value="{{property}}" class="item">{{value}}</div>
        * {{/eachOfObject}}
        */
        Handlebars.registerHelper('eachOfObject', function(context, options) {
            var ret = "";
            for (var prop in context) {
                ret = ret + options.fn({ property: prop, value: context[prop] });
            }
            return ret;
        });
        /**
        * Iterate only values of object, this will reference the value of current object
        * @name eachOfObjectValue
        * @memberof Handlebars
        * @example
        * {{#eachOfObjectValue apps}}
		* <div class="app searchable">
		* 	<div class="image" style="background-image: url('/appimages/{{this._id}}.png');"></div>
		* 	<div class="name">{{this.name}}</div>
		* 	<input class="app_id" type="hidden" value="{{this._id}}"/>
		* </div>
		* {{/eachOfObjectValue}}
        */
        Handlebars.registerHelper('eachOfObjectValue', function(context, options) {
            var ret = "";
            for (var prop in context) {
                ret = ret + options.fn(context[prop]);
            }
            return ret;
        });
        /**
        * Iterate through array, creating variable "index" for element index and variable "value" for value at that index
        * @name eachOfArray
        * @memberof Handlebars
        * @example
        * {{#eachOfArray events}}
		* <div class="searchable event-container {{#if value.is_active}}active{{/if}}" data-key="{{value.key}}">
		* 	<div class="name">{{value.name}}</div>
		* </div>
		* {{/eachOfArray}}
        */
        Handlebars.registerHelper('eachOfArray', function(context, options) {
            var ret = "";
            for (var i = 0; i < context.length; i++) {
                ret = ret + options.fn({ index: i, value: context[i] });
            }
            return ret;
        });
        /**
        * Print out json in pretty indented way
        * @name prettyJSON
        * @memberof Handlebars
        * @example
        * <td class="jh-value jh-object-value">{{prettyJSON value}}</td>
        */
        Handlebars.registerHelper('prettyJSON', function(context) {
            return JSON.stringify(context, undefined, 4);
        });
        /**
        * Shorten number, Handlebar binding to {@link countlyCommon.getShortNumber}
        * @name getShortNumber
        * @memberof Handlebars
        * @example
        * <span class="value">{{getShortNumber this.data.total}}</span>
        */
        Handlebars.registerHelper('getShortNumber', function(context) {
            return countlyCommon.getShortNumber(context);
        });
        /**
        * Format float number up to 2 values after dot
        * @name getFormattedNumber
        * @memberof Handlebars
        * @example
        * <div class="number">{{getFormattedNumber this.total}}</div>
        */
        Handlebars.registerHelper('getFormattedNumber', function(context) {
            if (isNaN(context)) {
                return context;
            }

            var ret = parseFloat((parseFloat(context).toFixed(2)).toString()).toString();
            return ret.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        });
        /**
        * Convert text to upper case
        * @name toUpperCase
        * @memberof Handlebars
        * @example
        * <div class="title">{{toUpperCase page-title}}</div>
        */
        Handlebars.registerHelper('toUpperCase', function(context) {
            return context.toUpperCase();
        });
        /**
        * Convert array of app ids to comma separate string of app names. Handlebar binding to {@link CountlyHelpers.appIdsToNames}
        * @name appIdsToNames
        * @memberof Handlebars
        * @example
        * <div class="apps">{{appIdsToNames appIds}}</div>
        */
        Handlebars.registerHelper('appIdsToNames', function(context) {
            return CountlyHelpers.appIdsToNames(context);
        });
        /**
        * Loop for specified amount of times. Creating variable "count" as current index from 1 to provided value
        * @name forNumberOfTimes
        * @memberof Handlebars
        * @example
        * <ul>
        * {{#forNumberOfTimes 10}}
		*   <li>{{count}}</li>
		* {{/forNumberOfTimes}}
        * </ul>
        */
        Handlebars.registerHelper('forNumberOfTimes', function(context, options) {
            var ret = "";
            for (var i = 0; i < context; i++) {
                ret = ret + options.fn({ count: i + 1 });
            }
            return ret;
        });
        /**
        * Loop for specified amount of times. with variable "need" & "now", loop time will be ${need} - ${now}
        * @name forNumberOfTimes
        * @memberof Handlebars
        * @example
        * <ul>
        * {{#forNumberOfTimes 10 3}}  // will loop 7 times
		*   <li>{{count}}</li>
		* {{/forNumberOfTimes}}
        * </ul>
        */

        Handlebars.registerHelper('forNumberOfTimesCalc', function(need, now, options) {
            var ret = "";
            var context = parseInt(need) - parseInt(now) ;
            for (var i = 0; i < context; i++) {
                ret = ret + options.fn({ count: i + 1 });
            }
            return ret;
        });
        /**
        * Replaces part of a string with a string.
        * @name replace
        * @memberof Handlebars
        * @example
        * <span>{{#replace value "(" " ("}}{{/replace}}</span>
		*/
        Handlebars.registerHelper('replace', function(string, to_replace, replacement) {
            return (string || '').replace(to_replace, replacement);
        });
        /**
        * Limit string length.
        * @name limitString
        * @memberof Handlebars
        * @example
        * <span>{{#limitString value 15}}{{/limitString}}</span>
		*/
        Handlebars.registerHelper('limitString', function(string, limit) {
            if (string.length > limit) {
                return (string || '').substr(0, limit) + "..";
            }
            else {
                return string;
            }
        });
        /**
        * Round the number
        * @name round
        * @memberof Handlebars
        * @example
        * <span>{{round number limit}}</span>
		*/
        Handlebars.registerHelper('round', function(number, limit) {
            return countlyCommon.round(number, limit);
        });
        Handlebars.registerHelper('include', function(templatename, options) {
            var partial = Handlebars.partials[templatename];
            var context = $.extend({}, this, options.hash);
            return partial(context);
        });
        /**
        * For loop in template providing start count, end count and increment
        * @name for
        * @memberof Handlebars
        * @example
        * {{#for start end 1}}
		* 	{{#ifCond this "==" ../data.curPage}}
		* 	<a href='#/manage/db/{{../../db}}/{{../../collection}}/page/{{this}}' class="current">{{this}}</a>
		* 	{{else}}
		* 	<a href='#/manage/db/{{../../db}}/{{../../collection}}/page/{{this}}'>{{this}}</a>
		* 	{{/ifCond}}
		* {{/for}}
        */
        Handlebars.registerHelper('for', function(from, to, incr, block) {
            var accum = '';
            for (var i = from; i < to; i += incr) {
                accum += block.fn(i);
            }
            return accum;
        });
        /**
        * If condition with different operators, accepting first value, operator and second value.
        * Accepted operators are ==, !=, ===, <, <=, >, >=, &&, ||
        * @name ifCond
        * @memberof Handlebars
        * @example
        * {{#ifCond this.data.trend "==" "u"}}
        *     <i class="material-icons">trending_up</i>
        * {{else}}
        *     <i class="material-icons">trending_down</i>
        * {{/ifCond}}
        */
        Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
            switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this); // eslint-disable-line
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this); // eslint-disable-line
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
            }
        });
        /**
        * Format timestamp to twitter like time ago format, Handlebar binding to {@link countlyCommon.formatTimeAgo}
        * @name formatTimeAgo
        * @memberof Handlebars
        * @example
        * <div class="time">{{{formatTimeAgo value.time}}</div>
        */
        Handlebars.registerHelper('formatTimeAgo', function(context) {
            return countlyCommon.formatTimeAgo(parseInt(context) / 1000);
        });
        /**
        * Get value form object by specific key, this will reference value of the object
        * @name withItem
        * @memberof Handlebars
        * @example
        * <p>{{#withItem ../apps key=app_id}}{{this}}{{/withItem}}</p>
        */
        Handlebars.registerHelper('withItem', function(object, options) {
            return options.fn(object[options.hash.key]);
        });

        /**
        * Encode uri component
        * @name encodeURIComponent 
        * @memberof Handlebars
        * @example
        * <a href="/path/{{encodeURIComponent entity}}" </a>
        */
        Handlebars.registerHelper('encodeURIComponent', function(entity) {
            return encodeURIComponent(entity);
        });

        $("body").addClass("lang-" + countlyCommon.BROWSER_LANG_SHORT);
        jQuery.i18n.properties({
            name: window.production ? 'localization/min/locale' : ["localization/dashboard/dashboard", "localization/help/help", "localization/mail/mail"].concat(countlyGlobal.plugins.map(function(plugin) {
                return plugin + "/localization/" + plugin;
            })),
            cache: true,
            language: countlyCommon.BROWSER_LANG_SHORT,
            countlyVersion: countlyGlobal.countlyVersion + "&" + countlyGlobal.pluginsSHA,
            path: countlyGlobal.cdn,
            mode: 'map',
            callback: function() {
                for (var key in jQuery.i18n.map) {
                    if (countlyGlobal.company) {
                        jQuery.i18n.map[key] = jQuery.i18n.map[key].replace(new RegExp("Countly", 'ig'), countlyGlobal.company);
                    }
                    jQuery.i18n.map[key] = countlyCommon.encodeSomeHtml(jQuery.i18n.map[key]);
                }
                self.origLang = JSON.stringify(jQuery.i18n.map);
            }
        });

        $(document).ready(function() {

            CountlyHelpers.initializeSelect();
            CountlyHelpers.initializeTextSelect();
            CountlyHelpers.initializeMultiSelect();

            if (countlyGlobal.licenseNotification && countlyGlobal.licenseNotification.length) {
                for (var idx = 0; idx < countlyGlobal.licenseNotification.length; idx++) {
                    countlyGlobal.licenseNotification[idx].id = countlyCommon.generateId();
                    CountlyHelpers.notify(countlyGlobal.licenseNotification[idx]);
                }
            }

            $(document).on('DOMNodeInserted', '.cly-select', function() {
                CountlyHelpers.makeSelectNative();
            });

            $.ajaxPrefilter(function(options) {
                var last5char = options.url.substring(options.url.length - 5, options.url.length);
                if (last5char === ".html") {
                    var version = countlyGlobal.countlyVersion || "";
                    options.url = options.url + "?v=" + version;
                }
            });
            var validateSession = function() {
                $.ajax({
                    url: countlyGlobal.path + "/session",
                    data: {check_session: true},
                    success: function(result) {
                        if (result === "logout") {
                            CountlyHelpers.logout("/logout");

                        }
                        if (result === "login") {
                            CountlyHelpers.logout();
                        }
                        setTimeout(function() {
                            validateSession();
                        }, countlyCommon.DASHBOARD_VALIDATE_SESSION || 30000);
                    }
                });
            };
            setTimeout(function() {
                validateSession();
            }, countlyCommon.DASHBOARD_VALIDATE_SESSION || 30000);//validates session each 30 seconds
            if (parseInt(countlyGlobal.config.session_timeout)) {
                var minTimeout, tenSecondTimeout, logoutTimeout;
                var shouldRecordAction = false;
                var extendSession = function() {
                    shouldRecordAction = false;
                    $.ajax({
                        url: countlyGlobal.path + "/session",
                        success: function(result) {
                            if (result === "logout") {
                                CountlyHelpers.logout("/logout");
                            }
                            if (result === "login") {
                                CountlyHelpers.logout();
                            }
                            else if (result === "success") {
                                shouldRecordAction = false;
                                var myTimeoutValue = parseInt(countlyGlobal.config.session_timeout) * 1000 * 60;
                                if (myTimeoutValue > 2147483647) { //max value used by set timeout function
                                    myTimeoutValue = 1800000;//30 minutes
                                }
                                setTimeout(function() {
                                    shouldRecordAction = true;
                                }, Math.round(myTimeoutValue / 2));
                                resetSessionTimeouts(myTimeoutValue);
                            }
                        },
                        error: function() {
                            shouldRecordAction = true;
                        }
                    });
                };

                var resetSessionTimeouts = function(timeout) {
                    var minute = timeout - 60 * 1000;
                    if (minTimeout) {
                        clearTimeout(minTimeout);
                        minTimeout = null;
                    }
                    if (minute > 0) {
                        minTimeout = setTimeout(function() {
                            CountlyHelpers.notify({ title: jQuery.i18n.map["common.session-expiration"], message: jQuery.i18n.map["common.expire-minute"], info: jQuery.i18n.map["common.click-to-login"] });
                        }, minute);
                    }
                    var tenSeconds = timeout - 10 * 1000;
                    if (tenSecondTimeout) {
                        clearTimeout(tenSecondTimeout);
                        tenSecondTimeout = null;
                    }
                    if (tenSeconds > 0) {
                        tenSecondTimeout = setTimeout(function() {
                            CountlyHelpers.notify({ title: jQuery.i18n.map["common.session-expiration"], message: jQuery.i18n.map["common.expire-seconds"], info: jQuery.i18n.map["common.click-to-login"] });
                        }, tenSeconds);
                    }
                    if (logoutTimeout) {
                        clearTimeout(logoutTimeout);
                        logoutTimeout = null;
                    }
                    logoutTimeout = setTimeout(function() {
                        extendSession();
                    }, timeout + 1000);
                };

                var myTimeoutValue = parseInt(countlyGlobal.config.session_timeout) * 1000 * 60;
                //max value used by set timeout function
                if (myTimeoutValue > 2147483647) {
                    myTimeoutValue = 1800000;
                }//30 minutes
                resetSessionTimeouts(myTimeoutValue);
                $(document).on("click mousemove extend-dashboard-user-session", function() {
                    if (shouldRecordAction) {
                        extendSession();
                    }
                });
                extendSession();
            }

            // If date range is selected initialize the calendar with these
            var periodObj = countlyCommon.getPeriod();
            if (Object.prototype.toString.call(periodObj) === '[object Array]' && periodObj.length === 2) {
                self.dateFromSelected = parseInt(periodObj[0], 10) + countlyCommon.getOffsetCorrectionForTimestamp(parseInt(periodObj[0], 10));
                self.dateToSelected = parseInt(periodObj[1], 10) + countlyCommon.getOffsetCorrectionForTimestamp(parseInt(periodObj[1], 10));
            }

            // Initialize localization related stuff

            // Localization test
            /*
             $.each(jQuery.i18n.map, function (key, value) {
             jQuery.i18n.map[key] = key;
             });
             */

            try {
                moment.locale(countlyCommon.BROWSER_LANG_SHORT);
            }
            catch (e) {
                moment.locale("en");
            }

            $(".reveal-language-menu").text(countlyCommon.BROWSER_LANG_SHORT.toUpperCase());

            $("#sidebar-events").click(function(e) {
                $.when(countlyEvent.refreshEvents()).then(function() {
                    if (countlyEvent.getEvents().length === 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["events.no-event"], "black");
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                });
            });

            // SIDEBAR
            $("#sidebar-menu").on("click", ".submenu-close", function() {
                $(this).parents(".sidebar-submenu").animate({ "right": "-170px" }, {
                    duration: 200,
                    easing: 'easeInExpo',
                    complete: function() {
                        $(".sidebar-submenu").hide();
                        $("#sidebar-menu>.sidebar-menu>.menu-category>.item").removeClass("menu-active");
                    }
                });
            });

            $("#sidebar-menu").on("click", ".item", function() {
                if ($(this).hasClass("menu-active")) {
                    return true;
                }

                $("#sidebar-menu>.sidebar-menu>.menu-category>.item").removeClass("menu-active");

                var elNext = $(this).next();

                if (elNext.hasClass("sidebar-submenu")) {
                    $(this).addClass("menu-active");
                    self.sidebar.submenu.toggle(elNext);
                }
                else {
                    $("#sidebar-menu").find(".item").removeClass("active");
                    $(this).addClass("active");

                    var mainMenuItem = $(this).parent(".sidebar-submenu").prev(".item");

                    if (mainMenuItem.length) {
                        mainMenuItem.addClass("active menu-active");
                    }
                    else {
                        self.sidebar.submenu.toggle();
                    }
                }
            });

            $("#sidebar-menu").hoverIntent({
                over: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if (!$(this).hasClass("menu-active") && $(".sidebar-submenu").is(":visible") && !visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.addClass("half-visible");
                        visibleSubmenu.animate({ "right": "-110px" }, { duration: 300, easing: 'easeOutExpo' });
                    }
                },
                out: function() { },
                selector: ".sidebar-menu>.menu-category>.item"
            });

            $("#sidebar-menu").hoverIntent({
                over: function() { },
                out: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if ($(".sidebar-submenu").is(":visible") && visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.removeClass("half-visible");
                        visibleSubmenu.animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                    }
                },
                selector: ""
            });

            $("#sidebar-menu").hoverIntent({
                over: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if (visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.removeClass("half-visible");
                        visibleSubmenu.animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                    }
                },
                out: function() { },
                selector: ".sidebar-submenu:visible"
            });

            $('#sidebar-menu').slimScroll({
                height: ($(window).height()) + 'px',
                railVisible: true,
                railColor: '#4CC04F',
                railOpacity: .2,
                color: '#4CC04F',
                disableFadeOut: false,
            });
            $(window).resize(function() {
                $('#sidebar-menu').slimScroll({
                    height: ($(window).height()) + 'px'
                });
            });

            $(".sidebar-submenu").on("click", ".item", function() {
                if ($(this).hasClass("disabled")) {
                    return true;
                }

                $(".sidebar-submenu .item").removeClass("active");
                $(this).addClass("active");
                $(this).parent().prev(".item").addClass("active");
            });

            $("#language-menu .item").click(function() {
                var langCode = $(this).data("language-code"),
                    langCodeUpper = langCode.toUpperCase();

                store.set("countly_lang", langCode);
                $(".reveal-language-menu").text(langCodeUpper);

                countlyCommon.BROWSER_LANG_SHORT = langCode;
                countlyCommon.BROWSER_LANG = langCode;

                $("body").removeClass(function(index, className) {
                    return (className.match(/(^|\s)lang-\S*/g) || []).join(' ');
                }).addClass("lang-" + langCode);

                try {
                    moment.locale(countlyCommon.BROWSER_LANG_SHORT);
                }
                catch (e) {
                    moment.locale("en");
                }

                countlyCommon.getMonths(true);

                $("#date-to").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
                $("#date-from").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

                $.ajax({
                    type: "POST",
                    url: countlyGlobal.path + "/user/settings/lang",
                    data: {
                        "username": countlyGlobal.member.username,
                        "lang": countlyCommon.BROWSER_LANG_SHORT,
                        _csrf: countlyGlobal.csrf_token
                    },
                    success: function() { }
                });

                jQuery.i18n.properties({
                    name: window.production ? 'localization/min/locale' : ["localization/dashboard/dashboard", "localization/help/help", "localization/mail/mail"].concat(countlyGlobal.plugins.map(function(plugin) {
                        return plugin + "/localization/" + plugin;
                    })),
                    cache: true,
                    language: countlyCommon.BROWSER_LANG_SHORT,
                    countlyVersion: countlyGlobal.countlyVersion + "&" + countlyGlobal.pluginsSHA,
                    path: countlyGlobal.cdn,
                    mode: 'map',
                    callback: function() {
                        for (var key in jQuery.i18n.map) {
                            if (countlyGlobal.company) {
                                jQuery.i18n.map[key] = jQuery.i18n.map[key].replace(new RegExp("Countly", 'ig'), countlyGlobal.company);
                            }
                            jQuery.i18n.map[key] = countlyCommon.encodeSomeHtml(jQuery.i18n.map[key]);
                        }

                        self.origLang = JSON.stringify(jQuery.i18n.map);
                        $.when(countlyLocation.changeLanguage()).then(function() {
                            self.activeView.render();
                        });
                    }
                });
            });

            $(document).on('click', "#save-account-details:not(.disabled)", function() {
                var username = $(".dialog #username").val(),
                    old_pwd = $(".dialog #old_pwd").val(),
                    new_pwd = $(".dialog #new_pwd").val(),
                    re_new_pwd = $(".dialog #re_new_pwd").val(),
                    api_key = $(".dialog #api-key").val();

                if (new_pwd !== re_new_pwd) {
                    $(".dialog #settings-save-result").addClass("red").text(jQuery.i18n.map["user-settings.password-match"]);
                    return true;
                }

                $(this).addClass("disabled");

                $.ajax({
                    type: "POST",
                    url: countlyGlobal.path + "/user/settings",
                    data: {
                        "username": username,
                        "old_pwd": old_pwd,
                        "new_pwd": new_pwd,
                        "api_key": api_key,
                        _csrf: countlyGlobal.csrf_token
                    },
                    success: function(result) {
                        var saveResult = $(".dialog #settings-save-result");

                        if (result === "username-exists") {
                            saveResult.removeClass("green").addClass("red").text(jQuery.i18n.map["management-users.username.exists"]);
                        }
                        else if (!result) {
                            saveResult.removeClass("green").addClass("red").text(jQuery.i18n.map["user-settings.alert"]);
                        }
                        else {
                            saveResult.removeClass("red").addClass("green").text(jQuery.i18n.map["user-settings.success"]);
                            $(".dialog #old_pwd").val("");
                            $(".dialog #new_pwd").val("");
                            $(".dialog #re_new_pwd").val("");
                            $("#menu-username").text(username);
                            $("#user-api-key").val(api_key);
                            countlyGlobal.member.username = username;
                            countlyGlobal.member.api_key = api_key;
                        }

                        $(".dialog #save-account-details").removeClass("disabled");
                    }
                });
            });

            var help = _.once(function() {
                CountlyHelpers.alert(jQuery.i18n.map["help.help-mode-welcome"], "popStyleGreen popStyleGreenWide", {button_title: jQuery.i18n.map["common.okay"] + "!", title: jQuery.i18n.map["help.help-mode-welcome-title"], image: "welcome-to-help-mode"});
            });

            $("#help-menu").click(function(e) {
                e.stopPropagation();
                $("#help-toggle-cbox").prop("checked", !$("#help-toggle-cbox").prop("checked"));
                $("#help-toggle").toggleClass("active");

                app.tipsify($("#help-toggle").hasClass("active"));

                if ($("#help-toggle").hasClass("active")) {
                    help();
                    $.idleTimer('destroy');
                    clearInterval(self.refreshActiveView);
                }
                else {
                    self.refreshActiveView = setInterval(function() {
                        self.performRefresh(self);
                    }, countlyCommon.DASHBOARD_REFRESH_MS);
                    $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);
                }
            });

            $("#help-toggle").click(function(e) {
                e.stopPropagation();
                if ($(e.target).attr("id") === "help-toggle-cbox") {
                    $("#help-toggle").toggleClass("active");

                    app.tipsify($("#help-toggle").hasClass("active"));

                    if ($("#help-toggle").hasClass("active")) {
                        help();
                        $.idleTimer('destroy');
                        clearInterval(self.refreshActiveView);
                    }
                    else {
                        self.refreshActiveView = setInterval(function() {
                            self.performRefresh(self);
                        }, countlyCommon.DASHBOARD_REFRESH_MS);
                        $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);
                    }
                }
            });

            var logoutRequest = function() {
                var logoutForm = document.createElement("form");
                logoutForm.action = countlyGlobal.path + '/logout';
                logoutForm.method = "post";
                logoutForm.style.display = "none";
                logoutForm.type = "submit";

                var logoutForm_csrf = document.createElement("input");
                logoutForm_csrf.name = '_csrf';
                logoutForm_csrf.value = countlyGlobal.csrf_token;
                logoutForm.appendChild(logoutForm_csrf);
                document.body.appendChild(logoutForm);

                logoutForm.submit();
                document.body.removeChild(logoutForm);
            };

            $("#user-logout").click(function(e) {
                e.preventDefault();
                store.remove('countly_active_app');
                store.remove('countly_date');
                store.remove('countly_location_city');
                logoutRequest();
            });

            $(".beta-button").click(function() {
                CountlyHelpers.alert("This feature is currently in beta so the data you see in this view might change or disappear into thin air.<br/><br/>If you find any bugs or have suggestions please let us know!<br/><br/><a style='font-weight:500;'>Captain Obvious:</a> You can use the message box that appears when you click the question mark on the bottom right corner of this page.", "black");
            });

            $("#content").on("click", "#graph-note", function() {
                CountlyHelpers.popup("#graph-note-popup");

                $(".note-date:visible").datepicker({
                    numberOfMonths: 1,
                    showOtherMonths: true,
                    onSelect: function() {
                        dateText();
                    }
                });

                $.datepicker.setDefaults($.datepicker.regional[""]);
                $(".note-date:visible").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

                $('.note-popup:visible .time-picker, .note-popup:visible .note-list').slimScroll({
                    height: '100%',
                    start: 'top',
                    wheelStep: 10,
                    position: 'right',
                    disableFadeOut: true
                });

                $(".note-popup:visible .time-picker span").on("click", function() {
                    $(".note-popup:visible .time-picker span").removeClass("selected");
                    $(this).addClass("selected");
                    dateText();
                });


                $(".note-popup:visible .manage-notes-button").on("click", function() {
                    $(".note-popup:visible .note-create").hide();
                    $(".note-popup:visible .note-manage").show();
                    $(".note-popup:visible .create-note-button").show();
                    $(this).hide();
                    $(".note-popup:visible .create-note").hide();
                });

                $(".note-popup:visible .create-note-button").on("click", function() {
                    $(".note-popup:visible .note-create").show();
                    $(".note-popup:visible .note-manage").hide();
                    $(".note-popup:visible .manage-notes-button").show();
                    $(this).hide();
                    $(".note-popup:visible .create-note").show();
                });

                dateText();
                /** sets selected date text */
                function dateText() {
                    var selectedDate = $(".note-date:visible").val(),
                        instance = $(".note-date:visible").data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                    $(".selected-date:visible").text(moment(date).format("D MMM YYYY") + ", " + $(".time-picker:visible span.selected").text());
                }

                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes) {
                    var noteDateIds = _.sortBy(_.keys(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes), function(el) {
                        return -parseInt(el);
                    });

                    for (var i = 0; i < noteDateIds.length; i++) {
                        var currNotes = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes[noteDateIds[i]];

                        for (var j = 0; j < currNotes.length; j++) {
                            $(".note-popup:visible .note-list").append(
                                '<div class="note">' +
                                '<div class="date" data-dateid="' + noteDateIds[i] + '">' + moment(noteDateIds[i], "YYYYMMDDHH").format("D MMM YYYY, HH:mm") + '</div>' +
                                '<div class="content">' + currNotes[j] + '</div>' +
                                '<div class="delete-note"><i class="fa fa-trash"></i></div>' +
                                '</div>'
                            );
                        }
                    }
                }

                if (!$(".note-popup:visible .note").length) {
                    $(".note-popup:visible .manage-notes-button").hide();
                }

                $('.note-popup:visible .note-content').textcounter({
                    max: 50,
                    countDown: true,
                    countDownText: jQuery.i18n.map["dashboard.note-title-remaining"] + ": ",
                });

                $(".note-popup:visible .note .delete-note").on("click", function() {
                    var dateId = $(this).siblings(".date").data("dateid"),
                        note = $(this).siblings(".content").text();

                    $(this).parents(".note").fadeOut().remove();

                    $.ajax({
                        type: "POST",
                        url: countlyGlobal.path + '/graphnotes/delete',
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "date_id": dateId,
                            "note": note,
                            _csrf: countlyGlobal.csrf_token
                        },
                        success: function(result) {
                            if (result === false) {
                                return false;
                            }
                            else {
                                updateGlobalNotes({ date_id: dateId, note: note }, "delete");
                                app.activeView.refresh();
                            }
                        }
                    });

                    if (!$(".note-popup:visible .note").length) {
                        $(".note-popup:visible .create-note-button").trigger("click");
                        $(".note-popup:visible .manage-notes-button").hide();
                    }
                });

                $(".note-popup:visible .create-note").on("click", function() {
                    if ($(this).hasClass("disabled")) {
                        return true;
                    }

                    $(this).addClass("disabled");

                    var selectedDate = $(".note-date:visible").val(),
                        instance = $(".note-date:visible").data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
                        dateId = moment(moment(date).format("D MMM YYYY") + ", " + $(".time-picker:visible span.selected").text(), "D MMM YYYY, HH:mm").format("YYYYMMDDHH"),
                        note = $(".note-popup:visible .note-content").val();

                    if (!note.length) {
                        $(".note-popup:visible .note-content").addClass("required-border");
                        $(this).removeClass("disabled");
                        return true;
                    }
                    else {
                        $(".note-popup:visible .note-content").removeClass("required-border");
                    }

                    $.ajax({
                        type: "POST",
                        url: countlyGlobal.path + '/graphnotes/create',
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "date_id": dateId,
                            "note": note,
                            _csrf: countlyGlobal.csrf_token
                        },
                        success: function(result) {
                            if (result === false) {
                                return false;
                            }
                            else {
                                updateGlobalNotes({ date_id: dateId, note: result }, "create");
                                app.activeView.refresh();
                                app.recordEvent({
                                    "key": "graph-note",
                                    "count": 1,
                                    "segmentation": {}
                                });
                            }
                        }
                    });

                    $("#overlay").trigger("click");
                });
                /** function updates global notes
                * @param {object} noteObj - note object
                * @param {string} operation - create or delete
                */
                function updateGlobalNotes(noteObj, operation) {
                    var globalNotes = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes;

                    if (operation === "create") {
                        if (globalNotes) {
                            if (globalNotes[noteObj.date_id]) {
                                countlyCommon.arrayAddUniq(globalNotes[noteObj.date_id], noteObj.note);
                            }
                            else {
                                globalNotes[noteObj.date_id] = [noteObj.note];
                            }
                        }
                        else {
                            var tmpNote = {};
                            tmpNote[noteObj.date_id] = [noteObj.note];

                            countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes = tmpNote;
                        }
                    }
                    else if (operation === "delete") {
                        if (globalNotes) {
                            if (globalNotes[noteObj.date_id]) {
                                globalNotes[noteObj.date_id] = _.without(globalNotes[noteObj.date_id], noteObj.note);
                            }
                        }
                    }
                }
            });

            // TOPBAR
            var $topbar = $("#top-bar"),
                $appNavigation = $("#app-navigation");

            $topbar.on("click", ".dropdown", function(e) {
                var wasActive = $(this).hasClass("clicked");
                $topbar.find(".dropdown").removeClass("clicked");

                if (wasActive) {
                    $(this).removeClass("clicked");
                }
                else {
                    $(this).find(".nav-search input").val("");
                    $(this).find(".list").scrollTop(0);
                    $(this).addClass("clicked");
                    var _this = $(this);
                    setTimeout(function() {
                        _this.find(".nav-search input").focus();
                    }, 50);
                }

                e.stopPropagation();
            });

            $topbar.on("click", ".dropdown .nav-search", function(e) {
                e.stopPropagation();
            });

            /**
             * Clear highlights class from app items
             * @param {array} filteredItems - filtered app items list
             */
            function clearHighlights(filteredItems) {
                var length = filteredItems.length;
                for (var i = 0; i < length; i++) {
                    $(filteredItems[i]).removeClass('highlighted-app-item');
                }
            }

            var arrowed = false;
            var currentIndex;
            $('#app-navigation').on('keyup', '.nav-search input', function(e) {
                var code = (e.keyCode || e.which);
                var filteredItems = $('#app-navigation > div.menu > div.list > .filtered-app-item');
                var indexLimit = filteredItems.length;
                if (code === 38) {
                    clearHighlights(filteredItems);
                    if (!arrowed) {
                        arrowed = true;
                        currentIndex = indexLimit - 1;
                    }
                    else {
                        currentIndex = currentIndex - 1;
                        if (currentIndex === -1) {
                            currentIndex = indexLimit - 1;
                        }
                    }
                    $(filteredItems[currentIndex]).addClass('highlighted-app-item');
                }
                else if (code === 40) {
                    clearHighlights(filteredItems);
                    if (!arrowed) {
                        arrowed = true;
                        currentIndex = 0;
                    }
                    else {
                        currentIndex = currentIndex + 1;
                        if (currentIndex === indexLimit) {
                            currentIndex = 0;
                        }
                    }
                    $(filteredItems[currentIndex]).addClass('highlighted-app-item');
                }
                else if (code === 13) {
                    $('#app-navigation').removeClass('clicked');
                    var appKey = $(filteredItems[currentIndex]).data("key"),
                        appId = $(filteredItems[currentIndex]).data("id"),
                        appName = $(filteredItems[currentIndex]).find(".name").text(),
                        appImage = $(filteredItems[currentIndex]).find(".app-icon").css("background-image");

                    $("#active-app-icon").css("background-image", appImage);
                    $("#active-app-name").text(appName);
                    $("#active-app-name").attr('title', appName);

                    if (self.activeAppKey !== appKey) {
                        self.activeAppName = appName;
                        self.activeAppKey = appKey;
                        self.switchApp(appId);
                        setTimeout(function() {
                            window.location.reload();
                        }, 1000);
                    }
                }
                else {
                    return;
                }
            });

            $topbar.on("click", ".dropdown .item", function(e) {
                $topbar.find(".dropdown").removeClass("clicked");
                e.stopPropagation();
            });

            $("body").on("click", function() {
                $topbar.find(".dropdown").removeClass("clicked");
            });

            $("#user_api_key_item").click(function() {
                $(this).find('input').first().select();
            });

            $topbar.on("click", "#hide-sidebar-button", function() {
                $("#hide-sidebar-button").toggleClass("active");
                var $analyticsMainView = $("#analytics-main-view");

                $analyticsMainView.find("#sidebar").toggleClass("hidden");
                $analyticsMainView.find("#content-container").toggleClass("cover-left");
            });

            // Prevent body scroll after list inside dropdown is scrolled till the end
            // Applies to any element that has prevent-body-scroll class as well
            $("document").on('DOMMouseScroll mousewheel', ".dropdown .list, .prevent-body-scroll", function(ev) {
                var $this = $(this),
                    scrollTop = this.scrollTop,
                    scrollHeight = this.scrollHeight,
                    height = $this.innerHeight(),
                    delta = ev.originalEvent.wheelDelta,
                    up = delta > 0;

                if (ev.target.className === 'item scrollable') {
                    return true;
                }

                var prevent = function() {
                    ev.stopPropagation();
                    ev.preventDefault();
                    ev.returnValue = false;
                    return false;
                };

                if (!up && -delta > scrollHeight - height - scrollTop) {
                    // Scrolling down, but this will take us past the bottom.
                    $this.scrollTop(scrollHeight);
                    return prevent();
                }
                else if (up && delta > scrollTop) {
                    // Scrolling up, but this will take us past the top.
                    $this.scrollTop(0);
                    return prevent();
                }
            }, {passive: false});

            $appNavigation.on("click", ".item", function() {
                var appKey = $(this).data("key"),
                    appId = $(this).data("id"),
                    appName = $(this).find(".name").text(),
                    appImage = $(this).find(".app-icon").css("background-image");

                $("#active-app-icon").css("background-image", appImage);
                $("#active-app-name").text(appName);
                $("#active-app-name").attr('title', appName);

                if (self.activeAppKey !== appKey) {
                    self.activeAppName = appName;
                    self.activeAppKey = appKey;
                    self.switchApp(appId);
                    setTimeout(function() {
                        window.location.reload();
                    }, 1000);
                }
            });

            $appNavigation.on("click", function() {
                var appList = $(this).find(".list"),
                    apps = _.sortBy(countlyGlobal.apps, function(app) {
                        return (app.name + "").toLowerCase();
                    });

                appList.html("");

                for (var i = 0; i < apps.length; i++) {
                    var currApp = apps[i];

                    var app = $("<div></div>");
                    app.addClass("item searchable");
                    app.data("key", currApp.key);
                    app.data("id", currApp._id);

                    var appIcon = $("<div></div>");
                    appIcon.addClass("app-icon");
                    appIcon.css("background-image", "url(" + countlyGlobal.cdn + "appimages/" + currApp._id + ".png");

                    var appName = $("<div></div>");
                    appName.addClass("name");
                    appName.attr("title", currApp.name);
                    appName.text(currApp.name);

                    app.append(appIcon);
                    app.append(appName);

                    appList.append(app);
                }
            });
        });

        if (!_.isEmpty(countlyGlobal.apps)) {
            if (!countlyCommon.ACTIVE_APP_ID) {
                var activeApp = (countlyGlobal.member && countlyGlobal.member.active_app_id && countlyGlobal.apps[countlyGlobal.member.active_app_id])
                    ? countlyGlobal.apps[countlyGlobal.member.active_app_id]
                    : countlyGlobal.defaultApp;

                countlyCommon.setActiveApp(activeApp._id);
                self.activeAppName = activeApp.name;
                $('#active-app-name').html(activeApp.name);
                $('#active-app-name').attr('title', activeApp.name);
                $("#active-app-icon").css("background-image", "url('" + countlyGlobal.cdn + "appimages/" + countlyCommon.ACTIVE_APP_ID + ".png')");
            }
            else {
                $("#active-app-icon").css("background-image", "url('" + countlyGlobal.cdn + "appimages/" + countlyCommon.ACTIVE_APP_ID + ".png')");
                $("#active-app-name").text(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name);
                $('#active-app-name').attr('title', countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name);
                self.activeAppName = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name;
            }
        }
        else {
            $("#new-install-overlay").show();
        }

        $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);

        $(document).bind("idle.idleTimer", function() {
            clearInterval(self.refreshActiveView);
        });

        $(document).bind("active.idleTimer", function() {
            self.activeView.restart();
            self.refreshActiveView = setInterval(function() {
                self.performRefresh(self);
            }, countlyCommon.DASHBOARD_REFRESH_MS);
        });

        $.fn.dataTableExt.oPagination.four_button = {
            "fnInit": function(oSettings, nPaging, fnCallbackDraw) {
                var nFirst = document.createElement('span');
                var nPrevious = document.createElement('span');
                var nNext = document.createElement('span');
                var nLast = document.createElement('span');

                nFirst.innerHTML = "<i class='fa fa-angle-double-left'></i>";
                nPrevious.innerHTML = "<i class='fa fa-angle-left'></i>";
                nNext.innerHTML = "<i class='fa fa-angle-right'></i>";
                nLast.innerHTML = "<i class='fa fa-angle-double-right'></i>";

                nFirst.className = "paginate_button first";
                nPrevious.className = "paginate_button previous";
                nNext.className = "paginate_button next";
                nLast.className = "paginate_button last";

                nPaging.appendChild(nFirst);
                nPaging.appendChild(nPrevious);
                nPaging.appendChild(nNext);
                nPaging.appendChild(nLast);

                $(nFirst).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "first");
                    fnCallbackDraw(oSettings);
                });

                $(nPrevious).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "previous");
                    fnCallbackDraw(oSettings);
                });

                $(nNext).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "next");
                    fnCallbackDraw(oSettings);
                });

                $(nLast).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "last");
                    fnCallbackDraw(oSettings);
                });

                $(nFirst).bind('selectstart', function() {
                    return false;
                });
                $(nPrevious).bind('selectstart', function() {
                    return false;
                });
                $(nNext).bind('selectstart', function() {
                    return false;
                });
                $(nLast).bind('selectstart', function() {
                    return false;
                });
            },

            "fnUpdate": function(oSettings /*,fnCallbackDraw*/) {
                if (!oSettings.aanFeatures.p) {
                    return;
                }

                var an = oSettings.aanFeatures.p;
                for (var i = 0, iLen = an.length; i < iLen; i++) {
                    var buttons = an[i].getElementsByTagName('span');
                    if (oSettings._iDisplayStart === 0) {
                        buttons[0].className = "paginate_disabled_previous";
                        buttons[1].className = "paginate_disabled_previous";
                    }
                    else {
                        buttons[0].className = "paginate_enabled_previous";
                        buttons[1].className = "paginate_enabled_previous";
                    }

                    if (oSettings.fnDisplayEnd() === oSettings.fnRecordsDisplay()) {
                        buttons[2].className = "paginate_disabled_next";
                        buttons[3].className = "paginate_disabled_next";
                    }
                    else {
                        buttons[2].className = "paginate_enabled_next";
                        buttons[3].className = "paginate_enabled_next";
                    }
                }
            }
        };

        $.fn.dataTableExt.oApi.fnStandingRedraw = function(oSettings) {
            if (oSettings.oFeatures.bServerSide === false) {
                var before = oSettings._iDisplayStart;

                oSettings.oApi._fnReDraw(oSettings);

                // iDisplayStart has been reset to zero - so lets change it back
                oSettings._iDisplayStart = before;
                oSettings.oApi._fnCalculateEnd(oSettings);
            }

            // draw the 'current' page
            oSettings.oApi._fnDraw(oSettings);
        };
        /** getCustomDateInt
        * @param {string} s - date string
        * @returns {number} number representating date
        */
        function getCustomDateInt(s) {
            if (s.indexOf("W") === 0) {
                s = s.replace(",", "");
                s = s.replace("W", "");
                dateParts = s.split(" ");
                return (parseInt(dateParts[0])) + parseInt(dateParts.pop() * 10000);
            }
            s = moment(s, countlyCommon.getDateFormat(countlyCommon.periodObj.dateString)).format(countlyCommon.periodObj.dateString);
            var dateParts = "";
            if (s.indexOf(":") !== -1) {
                if (s.indexOf(",") !== -1) {
                    s = s.replace(/,|:/g, "");
                    dateParts = s.split(" ");

                    return parseInt((countlyCommon.getMonths().indexOf(dateParts[1]) + 1) * 1000000) +
                        parseInt(dateParts[0]) * 10000 +
                        parseInt(dateParts[2]);
                }
                else {
                    return parseInt(s.replace(':', ''));
                }
            }
            else if (s.length === 3) {
                return countlyCommon.getMonths().indexOf(s) + 1;
            }
            else if (s.indexOf("W") === 0) {
                s = s.replace(",", "");
                s = s.replace("W", "");
                dateParts = s.split(" ");
                return (parseInt(dateParts[0])) + parseInt(dateParts.pop() * 10000);
            }
            else {
                s = s.replace(",", "");
                dateParts = s.split(" ");

                if (dateParts.length === 3) {
                    return (parseInt(dateParts[2]) * 10000) + parseInt((countlyCommon.getMonths().indexOf(dateParts[1]) + 1) * 100) + parseInt(dateParts[0]);
                }
                else {
                    if (dateParts[0].length === 3) {
                        return parseInt((countlyCommon.getMonths().indexOf(dateParts[0]) + 1) * 100) + parseInt(dateParts[1] * 10000);
                    }
                    else {
                        return parseInt((countlyCommon.getMonths().indexOf(dateParts[1]) + 1) * 100) + parseInt(dateParts[0]);
                    }
                }
            }
        }

        jQuery.fn.dataTableExt.oSort['customDate-asc'] = function(x, y) {
            x = getCustomDateInt(x);
            y = getCustomDateInt(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['customDate-desc'] = function(x, y) {
            x = getCustomDateInt(x);
            y = getCustomDateInt(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        /** getDateRangeInt
        * @param {string} s - range string
        * @returns {number} number representing range
        */
        function getDateRangeInt(s) {
            s = s.split("-")[0];
            var mEnglish = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            if (s.indexOf(":") !== -1) {
                var mName = (s.split(" ")[1]).split(",")[0];

                return s.replace(mName, parseInt(mEnglish.indexOf(mName))).replace(/[:, ]/g, "");
            }
            else {
                var parts = s.split(" ");
                if (parts.length > 1) {
                    return parseInt(mEnglish.indexOf(parts[1]) * 100) + parseInt(parts[0]);
                }
                else {
                    return parts[0].replace(/[><]/g, "");
                }
            }
        }

        jQuery.fn.dataTableExt.oSort['dateRange-asc'] = function(x, y) {
            x = getDateRangeInt(x);
            y = getDateRangeInt(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['dateRange-desc'] = function(x, y) {
            x = getDateRangeInt(x);
            y = getDateRangeInt(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['percent-asc'] = function(x, y) {
            x = parseFloat($("<a></a>").html(x).text().replace("%", ""));
            y = parseFloat($("<a></a>").html(y).text().replace("%", ""));

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['percent-desc'] = function(x, y) {
            x = parseFloat($("<a></a>").html(x).text().replace("%", ""));
            y = parseFloat($("<a></a>").html(y).text().replace("%", ""));

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['formatted-num-asc'] = function(x, y) {
            'use strict';

            // Define vars
            var a = [], b = [];

            // Match any character except: digits (0-9), dash (-), period (.), or backslash (/) and replace those characters with empty string.
            x = x.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line
            y = y.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line

            // Handle simple fractions
            if (x.indexOf('/') >= 0) {
                a = x.split("/");
                x = parseInt(a[0], 10) / parseInt(a[1], 10);
            }
            if (y.indexOf('/') >= 0) {
                b = y.split("/");
                y = parseInt(b[0], 10) / parseInt(b[1], 10);
            }

            return x - y;
        };

        jQuery.fn.dataTableExt.oSort['formatted-num-desc'] = function(x, y) {
            'use strict';

            // Define vars
            var a = [], b = [];

            // Match any character except: digits (0-9), dash (-), period (.), or backslash (/) and replace those characters with empty string.
            x = x.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line
            y = y.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line

            // Handle simple fractions
            if (x.indexOf('/') >= 0) {
                a = x.split("/");
                x = parseInt(a[0], 10) / parseInt(a[1], 10);
            }
            if (y.indexOf('/') >= 0) {
                b = y.split("/");
                y = parseInt(b[0], 10) / parseInt(b[1], 10);
            }

            return y - x;
        };

        jQuery.fn.dataTableExt.oSort['loyalty-asc'] = function(x, y) {
            x = countlySession.getLoyaltyIndex(x);
            y = countlySession.getLoyaltyIndex(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['loyalty-desc'] = function(x, y) {
            x = countlySession.getLoyaltyIndex(x);
            y = countlySession.getLoyaltyIndex(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['frequency-asc'] = function(x, y) {
            x = countlySession.getFrequencyIndex(x);
            y = countlySession.getFrequencyIndex(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['frequency-desc'] = function(x, y) {
            x = countlySession.getFrequencyIndex(x);
            y = countlySession.getFrequencyIndex(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['session-duration-asc'] = function(x, y) {
            x = countlySession.getDurationIndex(x);
            y = countlySession.getDurationIndex(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['session-duration-desc'] = function(x, y) {
            x = countlySession.getDurationIndex(x);
            y = countlySession.getDurationIndex(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['app_versions-asc'] = function(x, y) {
            return countlyCommon.compareVersions(x, y);
        };

        jQuery.fn.dataTableExt.oSort['app_versions-desc'] = function(x, y) {
            return countlyCommon.compareVersions(x, y);
        };

        jQuery.fn.dataTableExt.oSort['format-ago-asc'] = function(x, y) {
            return x - y;
        };

        jQuery.fn.dataTableExt.oSort['format-ago-desc'] = function(x, y) {
            return y - x;
        };
        /** saves current page
        * @param {object} dtable  - data table
        * @param {object} settings  -data table settings
        */
        function saveCurrentPage(dtable, settings) {
            var data = dtable.fnGetData();
            countlyCommon.dtSettings = countlyCommon.dtSettings || [];

            var previosTableStatus = countlyCommon.dtSettings.filter(function(item) {
                return (item.viewId === app.activeView.cid && item.selector === settings.sTableId);
            })[0];

            if (previosTableStatus) {
                previosTableStatus.dataLength = data.length;
                previosTableStatus.page = settings._iDisplayStart / settings._iDisplayLength;
            }
            else {
                countlyCommon.dtSettings.push({
                    viewId: app.activeView.cid,
                    selector: settings.sTableId,
                    dataLength: data.length,
                    page: settings._iDisplayStart / settings._iDisplayLength
                });
            }
        }
        /** sets current page
        * @param {object} dtable  - data table
        * @param {object} settings  -data table settings
        */
        function setCurrentPage(dtable, settings) {
            var tablePersistSettings = countlyCommon.dtSettings.filter(function(item) {
                return (item.viewId === app.activeView.cid && item.selector === settings.sTableId);
            })[0];

            if (tablePersistSettings && tablePersistSettings.dataLength === dtable.fnGetData().length) {
                dtable.fnPageChange(tablePersistSettings.page);
            }
        }
        /** gets page size
        * @param {object} settings  -data table settings
        * @returns {boolean} states if dtable is in active view
        */
        function getPageSize(settings) {
            var pageSizeSettings = countlyCommon.getPersistentSettings().pageSizeSettings;
            if (!pageSizeSettings) {
                pageSizeSettings = [];
            }

            var tablePersistSettings = pageSizeSettings.filter(function(item) {
                return (item.viewId === app.activeView.cid && item.selector === settings.sTableId);
            })[0];

            var pageSize;

            if (tablePersistSettings && tablePersistSettings.pageSize) {
                pageSize = tablePersistSettings.pageSize;
            }
            else if (settings.oInit && settings.oInit.iDisplayLength) {
                pageSize = settings.oInit.iDisplayLength;
            }
            else {
                pageSize = settings.iDisplayLength || settings._iDisplayLength || 50;
            }

            return pageSize;
        }

        $.extend(true, $.fn.dataTable.defaults, {
            "sDom": '<"dataTable-top"lfpT>t<"dataTable-bottom"i>',
            "bAutoWidth": false,
            "bLengthChange": true,
            "bPaginate": true,
            "sPaginationType": "four_button",
            "iDisplayLength": 50,
            "bDestroy": true,
            "bDeferRender": true,
            "oLanguage": {
                "sZeroRecords": jQuery.i18n.map["common.table.no-data"],
                "sInfoEmpty": jQuery.i18n.map["common.table.no-data"],
                "sEmptyTable": jQuery.i18n.map["common.table.no-data"],
                "sInfo": jQuery.i18n.map["common.showing"],
                "sInfoFiltered": jQuery.i18n.map["common.filtered"],
                "sSearch": jQuery.i18n.map["common.search"],
                "sLengthMenu": jQuery.i18n.map["common.show-items"] + "<input type='number' id='dataTables_length_input'/>"
            },
            "fnInitComplete": function(oSettings) {
                var dtable = this;
                dtable.fnSettings = dtable.fnSettings || function() {
                    return oSettings;
                };
                oSettings.nTable = oSettings.nTable || dtable;
                var saveHTML = "<div class='save-table-data' data-help='help.datatables-export'><i class='fa fa-download'></i></div>",
                    searchHTML = "<div class='search-table-data'><i class='fa fa-search'></i></div>",
                    tableWrapper = $("#" + oSettings.sTableId + "_wrapper");

                countlyCommon.dtSettings = countlyCommon.dtSettings || [];
                tableWrapper.bind('page', function(e, _oSettings) {
                    var dataTable = $(e.target).dataTable();
                    saveCurrentPage(dataTable, _oSettings);
                });

                tableWrapper.bind('init', function(e, _oSettings) {
                    var dataTable = $(e.target).dataTable();
                    if (_oSettings.oFeatures.bServerSide) {
                        setTimeout(function() {
                            setCurrentPage(dataTable, _oSettings);
                            oSettings.isInitFinished = true;
                            tableWrapper.show();
                        }, 0);
                    }
                    else {
                        setCurrentPage(dataTable, _oSettings);
                        oSettings.isInitFinished = true;
                        tableWrapper.show();
                    }
                });

                var selectButton = "<div class='select-column-table-data' style='display:none;'><p class='ion-gear-a'></p></div>";
                $(selectButton).insertBefore(tableWrapper.find(".dataTables_filter"));

                $(saveHTML).insertBefore(tableWrapper.find(".DTTT_container"));
                $(searchHTML).insertBefore(tableWrapper.find(".dataTables_filter"));
                tableWrapper.find(".dataTables_filter").html(tableWrapper.find(".dataTables_filter").find("input").attr("Placeholder", jQuery.i18n.map["common.search"]).clone(true));

                tableWrapper.find(".search-table-data").on("click", function() {
                    $(this).next(".dataTables_filter").toggle();
                    $(this).next(".dataTables_filter").find("input").focus();
                });

                tableWrapper.find(".dataTables_length").show();
                tableWrapper.find('#dataTables_length_input').bind('change.DT', function(/*e, _oSettings*/) {
                    //store.set("iDisplayLength", $(this).val());
                    if ($(this).val() && $(this).val().length > 0) {
                        var pageSizeSettings = countlyCommon.getPersistentSettings().pageSizeSettings;
                        if (!pageSizeSettings) {
                            pageSizeSettings = [];
                        }

                        var tableId = oSettings.sTableId;

                        if (!tableId) {
                            return;
                        }

                        var previosTableStatus = pageSizeSettings.filter(function(item) {
                            return (item.viewId === app.activeView.cid && item.selector === tableId);
                        })[0];

                        if (previosTableStatus) {
                            previosTableStatus.pageSize = parseInt($(this).val());
                        }
                        else {
                            pageSizeSettings.push({
                                viewId: app.activeView.cid,
                                selector: tableId,
                                pageSize: parseInt($(this).val())
                            });
                        }

                        countlyCommon.setPersistentSettings({ pageSizeSettings: pageSizeSettings });
                    }
                });
                var exportDrop;
                if (oSettings.oFeatures.bServerSide && !oSettings.oFeatures.localExport) {
                    //slowdown serverside filtering
                    tableWrapper.find('.dataTables_filter input').unbind();
                    var timeout = null;
                    tableWrapper.find('.dataTables_filter input').bind('keyup', function() {
                        var $this = this;
                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = null;
                        }
                        timeout = setTimeout(function() {
                            oSettings.oInstance.fnFilter($this.value);
                        }, 1000);
                    });
                    var exportView = $(dtable).data("view") || "activeView";
                    var exportAPIData = app[exportView].getExportAPI ? app[exportView].getExportAPI(oSettings.sTableId) : null;
                    var exportQueryData = app[exportView].getExportQuery ? app[exportView].getExportQuery(oSettings.sTableId) : null;

                    if (exportAPIData || exportQueryData) {
                        //create export dialog
                        var position = 'left middle';
                        if (oSettings.oInstance && oSettings.oInstance.addColumnExportSelector === true) {
                            position = 'left top';
                        }

                        exportDrop = new CountlyDrop({
                            target: tableWrapper.find('.save-table-data')[0],
                            content: "",
                            position: position,
                            classes: "server-export",
                            constrainToScrollParent: false,
                            remove: true,
                            openOn: "click"
                        });
                        exportDrop.on("open", function() {
                            if (exportAPIData) {
                                $(".server-export .countly-drop-content").empty().append(CountlyHelpers.export(oSettings._iRecordsDisplay, app[exportView].getExportAPI(oSettings.sTableId), null, true, oSettings.oInstance).removeClass("dialog"));
                            }
                            else if (exportQueryData) {
                                $(".server-export .countly-drop-content").empty().append(CountlyHelpers.export(oSettings._iRecordsDisplay, app[exportView].getExportQuery(oSettings.sTableId), null, null, oSettings.oInstance).removeClass("dialog"));
                            }
                            exportDrop.position();
                        });
                    }
                    else {
                        // tableWrapper.find(".dataTables_length").hide();
                        //create export dialog
                        var item = tableWrapper.find('.save-table-data')[0];
                        if (item) {
                            exportDrop = new CountlyDrop({
                                target: tableWrapper.find('.save-table-data')[0],
                                content: "",
                                position: 'left middle',
                                classes: "server-export",
                                constrainToScrollParent: false,
                                remove: true,
                                openOn: "click"
                            });
                            exportDrop.on("open", function() {
                                $(".server-export .countly-drop-content").empty().append(CountlyHelpers.tableExport(dtable, { api_key: countlyGlobal.member.api_key }, null, oSettings).removeClass("dialog"));
                                exportDrop.position();
                            });
                        }
                    }
                }
                else {
                    // tableWrapper.find(".dataTables_length").hide();
                    //create export dialog
                    var item2 = tableWrapper.find('.save-table-data')[0];
                    if (item2) {
                        exportDrop = new CountlyDrop({
                            target: tableWrapper.find('.save-table-data')[0],
                            content: "",
                            position: 'right middle',
                            classes: "server-export",
                            constrainToScrollParent: false,
                            remove: true,
                            openOn: "click"
                        });

                        exportDrop.on("open", function() {
                            $(".server-export .countly-drop-content").empty().append(CountlyHelpers.tableExport(dtable, { api_key: countlyGlobal.member.api_key }, null, oSettings).removeClass("dialog"));
                            exportDrop.position();
                        });
                    }
                }

                //tableWrapper.css({"min-height": tableWrapper.height()});
            },
            fnPreDrawCallback: function(oSettings) {
                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");

                if (oSettings.isInitFinished) {
                    tableWrapper.show();
                }
                else {
                    oSettings._iDisplayLength = getPageSize(oSettings);
                    $('.dataTables_length').find('input[type=number]').val(oSettings._iDisplayLength);
                    tableWrapper.hide();
                }

                if (tableWrapper.find(".table-placeholder").length === 0) {
                    var $placeholder = $('<div class="table-placeholder"><div class="top"></div><div class="header"></div></div>');
                    tableWrapper.append($placeholder);
                }

                if (tableWrapper.find(".table-loader").length === 0) {
                    tableWrapper.append("<div class='table-loader'></div>");
                }
            },
            fnDrawCallback: function(oSettings) {

                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
                tableWrapper.find(".dataTable-bottom").show();
                tableWrapper.find(".table-placeholder").remove();
                tableWrapper.find(".table-loader").remove();
            }
        });

        $.fn.dataTableExt.sErrMode = 'throw';
        $(document).ready(function() {
            setTimeout(function() {
                self.onAppSwitch(countlyCommon.ACTIVE_APP_ID, true, true);
            }, 1);
        });
    },
    /**
    * Localize all found html elements with data-localize and data-help-localize attributes
    * @param {jquery_object} el - jquery reference to parent element which contents to localize, by default all document is localized if not provided
    * @memberof app
    */
    localize: function(el) {
        var helpers = {
            onlyFirstUpper: function(str) {
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            },
            upper: function(str) {
                return str.toUpperCase();
            }
        };

        // translate help module
        (el ? el.find('[data-help-localize]') : $("[data-help-localize]")).each(function() {
            var elem = $(this);
            if (typeof elem.data("help-localize") !== "undefined") {
                elem.data("help", jQuery.i18n.map[elem.data("help-localize")]);
            }
        });

        // translate dashboard
        (el ? el.find('[data-localize]') : $("[data-localize]")).each(function() {
            var elem = $(this),
                toLocal = elem.data("localize").split("!"),
                localizedValue = "";

            if (toLocal.length === 2) {
                if (helpers[toLocal[0]]) {
                    localizedValue = helpers[toLocal[0]](jQuery.i18n.map[toLocal[1]]);
                }
                else {
                    localizedValue = jQuery.i18n.prop(toLocal[0], (toLocal[1]) ? jQuery.i18n.map[toLocal[1]] : "");
                }
            }
            else {
                localizedValue = jQuery.i18n.map[elem.data("localize")];
            }

            if (elem.is("input[type=text]") || elem.is("input[type=password]") || elem.is("textarea")) {
                elem.attr("placeholder", localizedValue);
            }
            else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
                elem.attr("value", localizedValue);
            }
            else {
                elem.html(localizedValue);
            }
        });
    },
    /**
    * Toggle showing tooltips, which are usually used in help mode for all elements containing css class help-zone-vs or help-zone-vb and having data-help attributes (which are generated automatically from data-help-localize attributes upon localization)
    * @param {boolean} enable - if true tooltips will be shown on hover, if false tooltips will be disabled
    * @param {jquery_object} el - jquery reference to parent element which contents to check for tooltips, by default all document is checked if not provided
    * @memberof app
    * @instance
    */
    tipsify: function(enable, el) {
        var vs = el ? el.find('.help-zone-vs') : $('.help-zone-vs'),
            vb = el ? el.find('.help-zone-vb') : $('.help-zone-vb'),
            both = el ? el.find('.help-zone-vs, .help-zone-vb') : $(".help-zone-vs, .help-zone-vb");

        vb.tipsy({
            gravity: $.fn.tipsy.autoNS,
            trigger: 'manual',
            title: function() {
                return $(this).data("help") || "";
            },
            fade: true,
            offset: 5,
            cssClass: 'yellow',
            opacity: 1,
            html: true
        });
        vs.tipsy({
            gravity: $.fn.tipsy.autoNS,
            trigger: 'manual',
            title: function() {
                return $(this).data("help") || "";
            },
            fade: true,
            offset: 5,
            cssClass: 'yellow narrow',
            opacity: 1,
            html: true
        });

        if (enable) {
            both.off('mouseenter mouseleave')
                .on('mouseenter', function() {
                    $(this).tipsy("show");
                })
                .on('mouseleave', function() {
                    $(this).tipsy("hide");
                });
        }
        else {
            both.off('mouseenter mouseleave');
        }
    },
    /**
    * Register new app type as mobile, web, desktop, etc. You can create new plugin to add new app type with its own dashboard
    * @param {string} name - name of the app type as mobile, web, desktop etc
    * @param {countlyView} view - instance of the countlyView to show as main dashboard for provided app type
    * @memberof app
    * @instance
    * @example
    * app.addAppType("mobile", MobileDashboardView);
    */
    addAppType: function(name, view) {
        if (view) {
            this.appTypes[name] = new view();
        }
        else {
            this.appTypes[name] = null;
        }
        var menu = $("#default-type").clone();
        menu.attr("id", name + "-type");
        $("#sidebar-menu").append(menu);

        //run all queued type menus
        if (this._menuForTypes[name]) {
            for (var i = 0; i < this._menuForTypes[name].length; i++) {
                this.addMenuForType(name, this._menuForTypes[name][i].category, this._menuForTypes[name][i].node);
            }
            this._menuForTypes[name] = null;
        }

        //run all queued type submenus
        if (this._subMenuForTypes[name]) {
            for (i = 0; i < this._subMenuForTypes[name].length; i++) {
                this.addSubMenuForType(name, this._subMenuForTypes[name][i].parent_code, this._subMenuForTypes[name][i].node);
            }
            this._subMenuForTypes[name] = null;
        }

        //run all queued all type menus
        for (i = 0; i < this._menuForAllTypes.length; i++) {
            this.addMenuForType(name, this._menuForAllTypes[i].category, this._menuForAllTypes[i].node);
        }

        //run all queued all type submenus
        for (i = 0; i < this._subMenuForAllTypes.length; i++) {
            this.addSubMenuForType(name, this._subMenuForAllTypes[i].parent_code, this._subMenuForAllTypes[i].node);
        }
    },
    /**
    * Add callback to be called when user changes app in dashboard, which can be used globally, outside of the view
    * @param {function} callback - function receives app_id param which is app id of the new app to which user switched
	* @param {string} name - Plugin name
    * @memberof app
    * @instance
    * @example
    * app.addAppSwitchCallback(function(appId){
    *    countlyCrashes.loadList(appId);
    * });
    */
    addAppSwitchCallback: function(callback, name) {
        name = name || 'core';
        this.appSwitchCallbacks.push({"name": name, "fn": callback});
    },
    /**
    * Add callback to be called when user changes app in Managment -> Applications section, useful when providing custom input additions to app editing for different app types
    * @param {function} callback - function receives app_id param which is app id and type which is app type
    * @memberof app
    * @instance
    * @example
    * app.addAppManagementSwitchCallback(function(appId, type){
    *   if (type == "mobile") {
    *       addPushHTMLIfNeeded(type);
    *       $("#view-app .appmng-push").show();
    *   } else {
    *       $("#view-app .appmng-push").hide();
    *   }
    * });
    */
    addAppManagementSwitchCallback: function(callback) {
        this.appManagementSwitchCallbacks.push(callback);
    },
    /**
    * Modify app object on app create/update before submitting it to server
    * @param {function} callback - function args object with all data that will be submitted to server on app create/update
    * @memberof app
    * @instance
    * @example
    * app.addAppObjectModificatorfunction(args){
    *   if (args.type === "mobile") {
    *       //do something for mobile
    *   }
    * });
    */
    addAppObjectModificator: function(callback) {
        this.appObjectModificators.push(callback);
    },
    /**
     * Add a countlyManagementView-extending view which will be displayed in accordion tabs on Management->Applications screen
     * @memberof app
     * @param {string} plugin - plugin name
     * @param {string} title  - plugin title
     * @param {object} View - plugin view
     */
    addAppManagementView: function(plugin, title, View) {
        if (countlyGlobal.plugins.indexOf(plugin) !== -1) {
            this.appManagementViews[plugin] = {title: title, view: View};
        }
    },
    /**
     * Add a countlyManagementView-extending view which will be displayed in accordion tabs on Management->Applications screen
     * @memberof app
     * @param {string} plugin - plugin name
     * @param {string} title  - plugin title
     * @param {Array} inputs - plugin inputs
     */
    addAppManagementInput: function(plugin, title, inputs) {
        if (countlyGlobal.plugins.indexOf(plugin) !== -1) {
            this.appManagementViews[plugin] = {title: title, inputs: inputs};
        }
    },
    /**
    * Add additional settings to app management. Allows you to inject html with css classes app-read-settings, app-write-settings and using data-id attribute for the key to store in app collection. And if your value or input needs additional processing, you may add the callbacks here
    * @param {string} id - the same value on your input data-id attributes
    * @param {object} options - different callbacks for data modification
    * @param {function} options.toDisplay - function to be called when data is prepared for displaying, pases reference to html element with app-read-settings css class in which value should be displayed
    * @param {function} options.toInput - function to be called when data is prepared for input, pases reference to html input element with app-write-settings css class in which value should be placed for editing
    * @param {function} options.toSave - function to be called when data is prepared for saving, pases reference to object args that will be sent to server ad html input element with app-write-settings css class from which value should be taken and placed in args
     * @param {function} options.toInject - function to be called when to inject HTML into app management view
    * @memberof app
    * @instance
    * @example
    * app.addAppSetting("my_setting", {
    *     toDisplay: function(appId, elem){$(elem).text(process(countlyGlobal['apps'][appId]["my_setting"]));},
    *     toInput: function(appId, elem){$(elem).val(process(countlyGlobal['apps'][appId]["my_setting"]));},
    *     toSave: function(appId, args, elem){
    *         args.my_setting = process($(elem).val());
    *     },
    *     toInject: function(){
    *         var addApp = '<tr class="help-zone-vs" data-help-localize="manage-apps.app-my_setting">'+
    *             '<td>'+
    *                 '<span data-localize="management-applications.my_setting"></span>'+
    *             '</td>'+
    *             '<td>'+
    *                 '<input type="text" value="" class="app-write-settings" data-localize="placeholder.my_setting" data-id="my_setting">'+
    *             '</td>'+
    *         '</tr>';
    *
    *         $("#add-new-app table .table-add").before(addApp);
    *
    *         var editApp = '<tr class="help-zone-vs" data-help-localize="manage-apps.app-my_settingt">'+
    *             '<td>'+
    *                 '<span data-localize="management-applications.my_setting"></span>'+
    *             '</td>'+
    *             '<td>'+
    *                 '<div class="read app-read-settings" data-id="my_setting"></div>'+
    *                 '<div class="edit">'+
    *                     '<input type="text" value="" class="app-write-settings" data-id="my_setting" data-localize="placeholder.my_setting">'+
    *                 '</div>'+
    *             '</td>'+
    *         '</tr>';
    *
    *         $(".app-details table .table-edit").before(editApp);
    *     }
    * });
    */
    addAppSetting: function(id, options) {
        this.appSettings[id] = options;
    },
    /**
    * Add callback to be called when user changes app type in UI in Managment -> Applications section (even without saving app type, just chaning in UI), useful when providing custom input additions to app editing for different app types
    * @param {function} callback - function receives type which is app type
    * @memberof app
    * @instance
    * @example
    * app.addAppAddTypeCallback(function(type){
    *   if (type == "mobile") {
    *       $("#view-app .appmng-push").show();
    *   } else {
    *       $("#view-app .appmng-push").hide();
    *   }
    * });
    */
    addAppAddTypeCallback: function(callback) {
        this.appAddTypeCallbacks.push(callback);
    },
    /**
    * Add callback to be called when user open user edit UI in Managment -> Users section (even without saving, just opening), useful when providing custom input additions to user editing
    * @param {function} callback - function receives user object and paramm which can be true if saving data, false if opening data, string to modify data
    * @memberof app
    * @instance
    */
    addUserEditCallback: function(callback) {
        this.userEditCallbacks.push(callback);
    },
    /**
    * Add custom data export handler from datatables to csv/xls exporter. Provide exporter name and callback function.
    * Then add the same name as sExport attribute to the first datatables column.
    * Then when user will want to export data from this table, your callback function will be called to get the data.
    * You must perpare array of objects all with the same keys, where keys are columns and value are table data and return it from callback
    * to be processed by exporter.
    * @param {string} name - name of the export to expect in datatables sExport attribute
    * @param {function} callback - callback to call when getting data
    * @memberof app
    * @instance
    * @example
    * app.addDataExport("userinfo", function(){
    *    var ret = [];
    *    var elem;
    *    for(var i = 0; i < tableData.length; i++){
    *        //use same keys for each array element with different user data
    *        elem ={
    *            "fullname": tableData[i].firstname + " " + tableData[i].lastname,
    *            "job": tableData[i].company + ", " + tableData[i].jobtitle,
    *            "email": tableData[i].email
    *        };
    *        ret.push(elem);
    *    }
    *    //return array
    *    return ret;
    * });
    */
    addDataExport: function(name, callback) {
        this.dataExports[name] = callback;
    },
    /**
    * Add callback to be called everytime new view/page is loaded, so you can modify view with javascript after it has been loaded
    * @param {string} view - view url/hash or with possible # as wildcard or simply providing # for any view
    * @param {function} callback - function to be called when view loaded
	* @param {string} name - Plugin name
    * @memberof app
    * @instance
    * @example <caption>Adding to single specific view with specific url</caption>
    * //this will work only for view bind to #/analytics/events
    * app.addPageScript("/analytics/events", function(){
    *   $("#event-nav-head").after(
    *       "<a href='#/analytics/events/compare'>" +
    *           "<div id='compare-events' class='event-container'>" +
    *               "<div class='icon'></div>" +
    *               "<div class='name'>" + jQuery.i18n.map["compare.button"] + "</div>" +
    *           "</div>" +
    *       "</a>"
    *   );
    * });

    * @example <caption>Add to all view subpages</caption>
    * //this will work /users/ and users/1 and users/abs etc
    * app.addPageScript("/users#", modifyUserDetailsForPush);

    * @example <caption>Adding script to any view</caption>
    * //this will work for any view
    * app.addPageScript("#", function(){
    *   alert("I am an annoying popup appearing on each view");
    * });
    */
    addPageScript: function(view, callback, name) {
        if (!name || CountlyHelpers.isPluginEnabled(name)) {
            if (!this.pageScripts[view]) {
                this.pageScripts[view] = [];
            }
            this.pageScripts[view].push(callback);
        }
    },
    /**
    * Add callback to be called everytime view is refreshed, because view may reset some html, and we may want to remodify it again. By default this happens every 10 seconds, so not cpu intensive tasks
    * @param {string} view - view url/hash or with possible # as wildcard or simply providing # for any view
    * @param {function} callback - function to be called when view refreshed
    * @memberof app
    * @instance
    * @example <caption>Adding to single specific view with specific url</caption>
    * //this will work only for view bind to #/analytics/events
    * app.addPageScript("/analytics/events", function(){
    *   $("#event-nav-head").after(
    *       "<a href='#/analytics/events/compare'>" +
    *           "<div id='compare-events' class='event-container'>" +
    *               "<div class='icon'></div>" +
    *               "<div class='name'>" + jQuery.i18n.map["compare.button"] + "</div>" +
    *           "</div>" +
    *       "</a>"
    *   );
    * });

    * @example <caption>Add to all view subpage refreshed</caption>
    * //this will work /users/ and users/1 and users/abs etc
    * app.addRefreshScript("/users#", modifyUserDetailsForPush);

    * @example <caption>Adding script to any view</caption>
    * //this will work for any view
    * app.addRefreshScript("#", function(){
    *   alert("I am an annoying popup appearing on each refresh of any view");
    * });
    */
    addRefreshScript: function(view, callback) {
        if (!this.refreshScripts[view]) {
            this.refreshScripts[view] = [];
        }
        this.refreshScripts[view].push(callback);
    },
    onAppSwitch: function(appId, refresh, firstLoad) {
        if (appId !== 0) {
            this._isFirstLoad = firstLoad;
            jQuery.i18n.map = JSON.parse(app.origLang);
            if (!refresh) {
                app.main(true);
                if (window.components && window.components.slider && window.components.slider.instance) {
                    window.components.slider.instance.close();
                }
            }
            $("#sidebar-menu .sidebar-menu").hide();
            var type = countlyGlobal.apps[appId].type;
            if ($("#sidebar-menu #" + type + "-type").length) {
                $("#sidebar-menu #" + type + "-type").show();
            }
            else {
                $("#sidebar-menu #default-type").show();
            }
            for (var i = 0; i < this.appSwitchCallbacks.length; i++) {
                if (CountlyHelpers.isPluginEnabled(this.appSwitchCallbacks[i].name)) {
                    this.appSwitchCallbacks[i].fn(appId);
                }
            }
            app.localize();
        }
    },
    onAppManagementSwitch: function(appId, type) {
        for (var i = 0; i < this.appManagementSwitchCallbacks.length; i++) {
            this.appManagementSwitchCallbacks[i](appId, type || countlyGlobal.apps[appId].type);
        }
        if ($("#app-add-name").length) {
            var newAppName = $("#app-add-name").val();
            $("#app-container-new .name").text(newAppName);
            $(".new-app-name").text(newAppName);
        }
    },
    onAppAddTypeSwitch: function(type) {
        for (var i = 0; i < this.appAddTypeCallbacks.length; i++) {
            this.appAddTypeCallbacks[i](type);
        }
    },
    onUserEdit: function(user, param) {
        for (var i = 0; i < this.userEditCallbacks.length; i++) {
            param = this.userEditCallbacks[i](user, param);
        }
        return param;
    },
    pageScript: function() { //scripts to be executed on each view change
        $("#month").text(moment().year());
        $("#day").text(moment().format("MMMM, YYYY"));
        $("#yesterday").text(moment().subtract(1, "days").format("Do"));

        var self = this;
        $(document).ready(function() {

            var selectedDateID = countlyCommon.getPeriod();

            if (Object.prototype.toString.call(selectedDateID) !== '[object Array]') {
                $("#" + selectedDateID).addClass("active");
            }
            var i = 0;
            var l = 0;
            if (self.pageScripts[Backbone.history.fragment]) {
                for (i = 0, l = self.pageScripts[Backbone.history.fragment].length; i < l; i++) {
                    self.pageScripts[Backbone.history.fragment][i]();
                }
            }
            for (var k in self.pageScripts) {
                if (k !== '#' && k.indexOf('#') !== -1 && Backbone.history.fragment.match("^" + k.replace(/#/g, '.*'))) {
                    for (i = 0, l = self.pageScripts[k].length; i < l; i++) {
                        self.pageScripts[k][i]();
                    }
                }
            }
            if (self.pageScripts["#"]) {
                for (i = 0, l = self.pageScripts["#"].length; i < l; i++) {
                    self.pageScripts["#"][i]();
                }
            }

            // Translate all elements with a data-help-localize or data-localize attribute
            self.localize();

            if ($("#help-toggle").hasClass("active")) {
                $('.help-zone-vb').tipsy({
                    gravity: $.fn.tipsy.autoNS,
                    trigger: 'manual',
                    title: function() {
                        return ($(this).data("help")) ? $(this).data("help") : "";
                    },
                    fade: true,
                    offset: 5,
                    cssClass: 'yellow',
                    opacity: 1,
                    html: true
                });
                $('.help-zone-vs').tipsy({
                    gravity: $.fn.tipsy.autoNS,
                    trigger: 'manual',
                    title: function() {
                        return ($(this).data("help")) ? $(this).data("help") : "";
                    },
                    fade: true,
                    offset: 5,
                    cssClass: 'yellow narrow',
                    opacity: 1,
                    html: true
                });

                $.idleTimer('destroy');
                clearInterval(self.refreshActiveView);
                $(".help-zone-vs, .help-zone-vb").hover(
                    function() {
                        $(this).tipsy("show");
                    },
                    function() {
                        $(this).tipsy("hide");
                    }
                );
            }

            $(document).off("chart:changed", ".usparkline").on("chart:changed", ".usparkline", function() {
                $(this).show();
            });
            $(document).off("chart:changed", ".dsparkline").on("chart:changed", ".dsparkline", function() {
                $(this).show();
            });
            $(".usparkline").peity("bar", { width: "100%", height: "30", colour: "#83C986", strokeColour: "#83C986", strokeWidth: 2 });
            $(".dsparkline").peity("bar", { width: "100%", height: "30", colour: "#DB6E6E", strokeColour: "#DB6E6E", strokeWidth: 2 });

            CountlyHelpers.setUpDateSelectors(self.activeView);

            $(window).click(function() {
                $("#date-picker").hide();
                $(".date-time-picker").hide();
                $(".cly-select").removeClass("active");
            });

            $("#date-picker").click(function(e) {
                e.stopPropagation();
            });

            $(".date-time-picker").click(function(e) {
                e.stopPropagation();
            });

            var dateTo;
            var dateFrom;
            $("#date-picker-button").click(function(e) {
                $("#date-picker").toggle();
                $("#date-picker-button").toggleClass("active");
                var date;
                if (self.dateToSelected) {
                    date = new Date(self.dateToSelected);
                    dateTo.datepicker("setDate", date);
                    dateFrom.datepicker("option", "maxDate", date);
                }
                else {
                    date = new Date();
                    date.setHours(0, 0, 0, 0);
                    self.dateToSelected = date.getTime();
                    dateTo.datepicker("setDate", new Date(self.dateToSelected));
                    dateFrom.datepicker("option", "maxDate", new Date(self.dateToSelected));
                }

                if (self.dateFromSelected) {
                    date = new Date(self.dateFromSelected);
                    dateFrom.datepicker("setDate", date);
                    dateTo.datepicker("option", "minDate", date);
                }
                else {
                    var extendDate = moment(dateTo.datepicker("getDate"), "MM-DD-YYYY").subtract(30, 'days').toDate();
                    extendDate.setHours(0, 0, 0, 0);
                    dateFrom.datepicker("setDate", extendDate);
                    self.dateFromSelected = extendDate.getTime();
                    dateTo.datepicker("option", "minDate", new Date(self.dateFromSelected));
                }

                $("#date-from-input").val(moment(dateFrom.datepicker("getDate"), "MM-DD-YYYY").format("MM/DD/YYYY"));
                $("#date-to-input").val(moment(dateTo.datepicker("getDate"), "MM-DD-YYYY").format("MM/DD/YYYY"));

                dateTo.datepicker("refresh");
                dateFrom.datepicker("refresh");
                //setSelectedDate();
                e.stopPropagation();
            });

            dateTo = $("#date-to").datepicker({
                numberOfMonths: 1,
                showOtherMonths: true,
                maxDate: moment().toDate(),
                onSelect: function(selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);
                    date.setHours(0, 0, 0, 0);
                    if (date.getTime() < self.dateFromSelected) {
                        self.dateFromSelected = date.getTime();
                    }
                    $("#date-to-input").val(moment(date).format("MM/DD/YYYY"));
                    dateFrom.datepicker("option", "maxDate", date);
                    self.dateToSelected = date.getTime();
                },
                beforeShowDay: function(date) {
                    var ts = date.getTime();
                    if (ts < moment($("#date-to-input").val(), "MM/DD/YYYY") && ts >= moment($("#date-from-input").val(), "MM/DD/YYYY")) {
                        return [true, "in-range", ""];
                    }
                    else {
                        return [true, "", ""];
                    }
                }
            });

            dateFrom = $("#date-from").datepicker({
                numberOfMonths: 1,
                showOtherMonths: true,
                maxDate: moment().subtract(1, 'days').toDate(),
                onSelect: function(selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);
                    date.setHours(0, 0, 0, 0);
                    if (date.getTime() > self.dateToSelected) {
                        self.dateToSelected = date.getTime();
                    }
                    $("#date-from-input").val(moment(date).format("MM/DD/YYYY"));
                    dateTo.datepicker("option", "minDate", date);
                    self.dateFromSelected = date.getTime();
                },
                beforeShowDay: function(date) {
                    var ts = date.getTime();
                    if (ts <= moment($("#date-to-input").val(), "MM/DD/YYYY") && ts > moment($("#date-from-input").val(), "MM/DD/YYYY")) {
                        return [true, "in-range", ""];
                    }
                    else {
                        return [true, "", ""];
                    }
                }
            });

            $("#date-from-input").keyup(function(event) {
                if (event.keyCode === 13) {
                    var date = moment($("#date-from-input").val(), "MM/DD/YYYY");

                    if (date.format("MM/DD/YYYY") !== $("#date-from-input").val()) {
                        var jsDate = $('#date-from').datepicker('getDate');
                        $("#date-from-input").val(moment(jsDate.getTime()).format("MM/DD/YYYY"));
                    }
                    else {
                        dateTo.datepicker("option", "minDate", date.toDate());
                        if (date.valueOf() > self.dateToSelected) {
                            date.startOf('day');
                            self.dateToSelected = date.valueOf();
                            dateFrom.datepicker("option", "maxDate", date.toDate());
                            dateTo.datepicker("setDate", date.toDate());
                            $("#date-to-input").val(date.format("MM/DD/YYYY"));

                        }
                        dateFrom.datepicker("setDate", date.toDate());
                    }
                }
            });


            $("#date-to-input").keyup(function(event) {
                if (event.keyCode === 13) {
                    var date = moment($("#date-to-input").val(), "MM/DD/YYYY");
                    if (date.format("MM/DD/YYYY") !== $("#date-to-input").val()) {
                        var jsDate = $('#date-to').datepicker('getDate');
                        $("#date-to-input").val(moment(jsDate.getTime()).format("MM/DD/YYYY"));
                    }
                    else {
                        dateFrom.datepicker("option", "maxDate", date.toDate());
                        if (date.toDate() < self.dateFromSelected) {
                            date.startOf('day');
                            self.dateFromSelected = date.valueOf();
                            dateTo.datepicker("option", "minDate", date.toDate());
                            dateFrom.datepicker("setDate", date.toDate());
                            $("#date-from-input").val(date.format("MM/DD/YYYY"));
                        }
                        dateTo.datepicker("setDate", date.toDate());
                    }
                }
            });
            /** function sets selected date */
            function setSelectedDate() {
                $("#selected-date").text(countlyCommon.getDateRangeForCalendar());
            }

            $.datepicker.setDefaults($.datepicker.regional[""]);
            $("#date-to").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

            $("#date-from").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

            $("#date-submit").click(function() {
                if (!self.dateFromSelected && !self.dateToSelected) {
                    return false;
                }

                countlyCommon.setPeriod([
                    self.dateFromSelected - countlyCommon.getOffsetCorrectionForTimestamp(self.dateFromSelected),
                    self.dateToSelected - countlyCommon.getOffsetCorrectionForTimestamp(self.dateToSelected) + 24 * 60 * 60 * 1000 - 1
                ]);

                self.activeView.dateChanged();
                app.runRefreshScripts();
                setSelectedDate();
                $("#date-selector .calendar").removeClass("active");
                $(".date-selector").removeClass("selected").removeClass("active");
                $("#date-picker").hide();
            });

            $("#date-cancel").click(function() {
                $("#date-selector .calendar").removeClass("selected").removeClass("active");
                $("#date-picker").hide();
            });

            $("#date-cancel").click(function() {
                $("#date-selector .calendar").removeClass("selected").removeClass("active");
                $("#date-picker").hide();
            });

            setSelectedDate();

            $('.scrollable').slimScroll({
                height: '100%',
                start: 'top',
                wheelStep: 10,
                position: 'right',
                disableFadeOut: true
            });

            $(".checkbox").on('click', function() {
                $(this).toggleClass("checked");
            });

            $(".resource-link").on('click', function() {
                if ($(this).data("link")) {
                    CountlyHelpers.openResource($(this).data("link"));
                }
            });

            $("#sidebar-menu").find(".item").each(function() {
                if ($(this).next().hasClass("sidebar-submenu") && $(this).find(".ion-chevron-right").length === 0) {
                    $(this).append("<span class='ion-chevron-right'></span>");
                }
            });

            $('.nav-search').on('input', "input", function() {
                var searchText = new RegExp($(this).val().toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')),
                    searchInside = $(this).parent().next().find(".searchable");

                searchInside.filter(function() {
                    return !(searchText.test($(this).text().toLowerCase()));
                }).css('display', 'none').removeClass('filtered-app-item');

                searchInside.filter(function() {
                    return searchText.test($(this).text().toLowerCase());
                }).css('display', 'block').addClass('filtered-app-item');
            });

            $(document).on('input', "#listof-apps .search input", function() {
                var searchText = new RegExp($(this).val().toLowerCase()),
                    searchInside = $(this).parent().next().find(".searchable");

                searchInside.filter(function() {
                    return !(searchText.test($(this).text().toLowerCase()));
                }).css('display', 'none');

                searchInside.filter(function() {
                    return searchText.test($(this).text().toLowerCase());
                }).css('display', 'block');
            });

            $(document).on('mouseenter', ".bar-inner", function() {
                var number = $(this).parent().next();

                number.text($(this).data("item"));
                number.css({ "color": $(this).css("background-color") });
            });

            $(document).on('mouseleave', ".bar-inner", function() {
                var number = $(this).parent().next();

                number.text(number.data("item"));
                number.css({ "color": $(this).parent().find(".bar-inner:first-child").css("background-color") });
            });

            /*
                Auto expand left navigation (events, management > apps etc)
                if ellipsis is applied to children
             */
            var closeLeftNavExpand;
            var leftNavSelector = "#event-nav, #app-management-bar, #configs-title-bar";
            var $leftNav = $(leftNavSelector);

            $leftNav.hoverIntent({
                over: function() {
                    var parentLeftNav = $(this).parents(leftNavSelector);

                    if (leftNavNeedsExpand(parentLeftNav)) {
                        parentLeftNav.addClass("expand");
                    }
                },
                out: function() {
                    // Delay shrinking and allow movement towards the top section cancel it
                    closeLeftNavExpand = setTimeout(function() {
                        $(this).parents(leftNavSelector).removeClass("expand");
                    }, 500);
                },
                selector: ".slimScrollDiv"
            });

            $leftNav.on("mousemove", function() {
                if ($(this).hasClass("expand")) {
                    clearTimeout(closeLeftNavExpand);
                }
            });

            $leftNav.on("mouseleave", function() {
                $(this).removeClass("expand");
            });

            /** Checks if nav needs to expand
                @param {object} $nav html element
                @returns {boolean} true or false
            */
            function leftNavNeedsExpand($nav) {
                var makeExpandable = false;

                $nav.find(".event-container:not(#compare-events) .name, .app-container .name, .config-container .name").each(function(z, el) {
                    if (el.offsetWidth < el.scrollWidth) {
                        makeExpandable = true;
                        return false;
                    }
                });

                return makeExpandable;
            }
            /* End of auto expand code */
        });
    }
});

Backbone.history || (Backbone.history = new Backbone.History);
Backbone.history._checkUrl = Backbone.history.checkUrl;
Backbone.history.urlChecks = [];
Backbone.history.checkOthers = function() {
    var proceed = true;
    for (var i = 0; i < Backbone.history.urlChecks.length; i++) {
        if (!Backbone.history.urlChecks[i]()) {
            proceed = false;
        }
    }
    return proceed;
};
Backbone.history.checkUrl = function() {
    if (Backbone.history.checkOthers()) {
        Backbone.history._checkUrl();
    }
};

Backbone.history.noHistory = function(hash) {
    if (history && history.replaceState) {
        history.replaceState(undefined, undefined, hash);
    }
    else {
        location.replace(hash);
    }
};

Backbone.history.__checkUrl = Backbone.history.checkUrl;
Backbone.history._getFragment = Backbone.history.getFragment;
Backbone.history.appIds = [];
for (var i in countlyGlobal.apps) {
    Backbone.history.appIds.push(i);
}
Backbone.history.getFragment = function() {
    var fragment = Backbone.history._getFragment();
    if (fragment.indexOf("/" + countlyCommon.ACTIVE_APP_ID) === 0) {
        fragment = fragment.replace("/" + countlyCommon.ACTIVE_APP_ID, "");
    }
    return fragment;
};
Backbone.history.checkUrl = function() {
    store.set("countly_fragment_name", Backbone.history._getFragment());
    var app_id = Backbone.history._getFragment().split("/")[1] || "";
    if (countlyCommon.APP_NAMESPACE !== false && countlyCommon.ACTIVE_APP_ID !== 0 && countlyCommon.ACTIVE_APP_ID !== app_id && Backbone.history.appIds.indexOf(app_id) === -1) {
        Backbone.history.noHistory("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history._getFragment());
        app_id = countlyCommon.ACTIVE_APP_ID;
    }

    if (countlyCommon.ACTIVE_APP_ID !== 0 && countlyCommon.ACTIVE_APP_ID !== app_id && Backbone.history.appIds.indexOf(app_id) !== -1) {
        app.switchApp(app_id, function() {
            if (Backbone.history.checkOthers()) {
                Backbone.history.__checkUrl();
            }
        });
    }
    else {
        if (Backbone.history.checkOthers()) {
            Backbone.history.__checkUrl();
        }
    }
};

/*
var checkGlobalAdminOnlyPermission = function() {
    var userCheckList = [
        "/manage/users",
        "/manage/apps"
    ];

    var adminCheckList = [
        "/manage/users"
    ];

    if (!countlyGlobal.member.global_admin && !countlyGlobal.config.autonomous) {
        var existed = false;
        var checkList = userCheckList;
        if (countlyAuth.getAdminApps(countlyGlobal.member) && countlyAuth.getAdminApps(countlyGlobal.member).length) {
            checkList = adminCheckList;
        }
        checkList.forEach(function(item) {
            if (Backbone.history.getFragment().indexOf(item) > -1) {
                existed = true;
            }
        });
        if (existed === true) {
            window.location.hash = "/";
            return false;
        }
    }
    return true;
};
*/
//Backbone.history.urlChecks.push(checkGlobalAdminOnlyPermission);


//initial hash check
(function() {
    if (!Backbone.history.getFragment() && store.get("countly_fragment_name")) {
        Backbone.history.noHistory("#" + store.get("countly_fragment_name"));
    }
    else {
        var app_id = Backbone.history._getFragment().split("/")[1] || "";
        if (countlyCommon.ACTIVE_APP_ID === app_id || Backbone.history.appIds.indexOf(app_id) !== -1) {
            //we have app id
            if (app_id !== countlyCommon.ACTIVE_APP_ID) {
                // but it is not currently selected app, so let' switch
                countlyCommon.setActiveApp(app_id);
                $("#active-app-name").text(countlyGlobal.apps[app_id].name);
                $('#active-app-name').attr('title', countlyGlobal.apps[app_id].name);
                $("#active-app-icon").css("background-image", "url('" + countlyGlobal.path + "appimages/" + app_id + ".png')");
            }
        }
        else if (countlyCommon.APP_NAMESPACE !== false) {
            //add current app id
            Backbone.history.noHistory("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history._getFragment());
        }
    }
})();

var app = new AppRouter();

/**
* Navigate to another hash address programmatically, without trigering view route and without leaving trace in history, if possible
* @param {string} hash - url path (hash part) to change
* @memberof app
* @example
* //you are at #/manage/systemlogs
* app.noHistory("#/manage/systemlogs/query/{}");
* //now pressing back would not go to #/manage/systemlogs
*/
app.noHistory = function(hash) {
    if (countlyCommon.APP_NAMESPACE !== false) {
        hash = "#/" + countlyCommon.ACTIVE_APP_ID + hash.substr(1);
    }
    if (history && history.replaceState) {
        history.replaceState(undefined, undefined, hash);
    }
    else {
        location.replace(hash);
    }
};

//collects requests for active views to dscard them if views changed
$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    //add to options for independent!!!

    var myurl = "";
    var mydata = "{}";
    if (originalOptions && originalOptions.url) {
        myurl = originalOptions.url;
    }
    if (originalOptions && originalOptions.data) {
        mydata = JSON.stringify(originalOptions.data);
    }
    //request which is not killed on view change(only on app change)
    jqXHR.my_set_url = myurl;
    jqXHR.my_set_data = mydata;

    if (originalOptions && (originalOptions.type === 'GET' || originalOptions.type === 'get') && originalOptions.url.substr(0, 2) === '/o') {
        if (originalOptions.data && originalOptions.data.preventGlobalAbort && originalOptions.data.preventGlobalAbort === true) {
            return true;
        }

        if (originalOptions.data && originalOptions.data.preventRequestAbort && originalOptions.data.preventRequestAbort === true) {
            if (app._myRequests[myurl] && app._myRequests[myurl][mydata]) {
                jqXHR.abort_reason = "duplicate";
                jqXHR.abort(); //we already have same working request
            }
            else {
                jqXHR.always(function(data, textStatus, jqXHR1) {
                    //if success jqxhr object is third, errored jqxhr object is in first parameter.
                    if (jqXHR1 && jqXHR1.my_set_url && jqXHR1.my_set_data) {
                        if (app._myRequests[jqXHR1.my_set_url] && app._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data]) {
                            delete app._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data];
                        }
                    }
                    else if (data && data.my_set_url && data.my_set_data) {
                        if (app._myRequests[data.my_set_url] && app._myRequests[data.my_set_url][data.my_set_data]) {
                            delete app._myRequests[data.my_set_url][data.my_set_data];
                        }

                    }
                });
                //save request in our object
                if (!app._myRequests[myurl]) {
                    app._myRequests[myurl] = {};
                }
                app._myRequests[myurl][mydata] = jqXHR;
            }
        }
        else {
            if (app.activeView) {
                if (app.activeView._myRequests && app.activeView._myRequests[myurl] && app.activeView._myRequests[myurl][mydata]) {
                    jqXHR.abort_reason = "duplicate";
                    jqXHR.abort(); //we already have same working request
                }
                else {
                    jqXHR.always(function(data, textStatus, jqXHR1) {
                        //if success jqxhr object is third, errored jqxhr object is in first parameter.
                        if (jqXHR1 && jqXHR1.my_set_url && jqXHR1.my_set_data) {
                            if (app.activeView._myRequests[jqXHR1.my_set_url] && app.activeView._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data]) {
                                delete app.activeView._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data];
                            }
                        }
                        else if (data && data.my_set_url && data.my_set_data) {
                            if (app.activeView._myRequests[data.my_set_url] && app.activeView._myRequests[data.my_set_url][data.my_set_data]) {
                                delete app.activeView._myRequests[data.my_set_url][data.my_set_data];
                            }
                        }
                    });
                    //save request in our object
                    if (!app.activeView._myRequests[myurl]) {
                        app.activeView._myRequests[myurl] = {};
                    }
                    app.activeView._myRequests[myurl][mydata] = jqXHR;
                }
            }
        }
    }
});