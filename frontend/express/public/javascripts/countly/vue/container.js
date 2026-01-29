import { validateRead, validateGlobalAdmin } from "../countly.auth";
import { isPluginEnabled } from "../countly.helpers";


// Module-level state
const dict = {};

/**
 * Register data to a container by id, with optional priority-based ordering
 * @param {string} id - the container identifier to register data to
 * @param {object} value - the data object to register, may include pluginName, permission, and priority properties
 * @param {string} [type] - optional type, use 'object' to store as object instead of array
 */
export function registerData(id, value, type) {
    if (value && (value.pluginName || value.permission) && !isPluginEnabled(value.pluginName || value.permission)) {
        return;
    }

    if (!Object.prototype.hasOwnProperty.call(dict, id)) {
        dict[id] = {};
    }

    // Note: type property is used when registring data value as object type. By default, container keeps array type.
    if (type === 'object') {
        dict[id].data = {};
        Object.assign(dict[id].data, value);
        return;
    }

    if (!Object.prototype.hasOwnProperty.call(dict[id], "data")) {
        dict[id].data = [];
    }

    const _items = dict[id].data;

    if (!Object.prototype.hasOwnProperty.call(value, 'priority')) {
        _items.push(Object.freeze(value));
    }
    else {
        let found = false;
        let i = 0;
        while (!found && i < _items.length) {
            if (!Object.prototype.hasOwnProperty.call(_items[i], 'priority') || _items[i].priority > value.priority) {
                found = true;
            }
            else {
                i++;
            }
        }
        _items.splice(i, 0, value);
    }
}

/**
 * Register a tab to a container by id, with priority-based ordering
 * @param {string} id - the container identifier to register the tab to
 * @param {object} tab - the tab configuration object with optional pluginName, permission, and priority properties
 */
export function registerTab(id, tab) {
    if (tab) {
        if ((tab.pluginName || tab.permission) && !isPluginEnabled(tab.pluginName || tab.permission)) {
            return;
        }

        if (!Object.prototype.hasOwnProperty.call(dict, id)) {
            dict[id] = {};
        }

        if (!Object.prototype.hasOwnProperty.call(dict[id], "tabs")) {
            dict[id].tabs = [];
        }

        tab.priority = tab.priority || 0;
        let putAt = dict[id].tabs.length;

        if (tab.priority) {
            for (let zz = 0; zz < dict[id].tabs.length; zz++) {
                if (dict[id].tabs[zz].priority && dict[id].tabs[zz].priority > tab.priority) {
                    putAt = zz;
                    break;
                }
            }
        }
        dict[id].tabs.splice(putAt, 0, tab);
    }
}

/**
 * Register a Vue mixin to a container by id
 * @param {string} id - the container identifier to register the mixin to
 * @param {object} mixin - the Vue mixin object, may include pluginName property for plugin filtering
 */
export function registerMixin(id, mixin) {
    if (mixin && (!mixin.pluginName || isPluginEnabled(mixin.pluginName))) {
        if (!Object.prototype.hasOwnProperty.call(dict, id)) {
            dict[id] = {};
        }

        if (!Object.prototype.hasOwnProperty.call(dict[id], "mixins")) {
            dict[id].mixins = [];
        }

        dict[id].mixins.push(mixin);
    }
}

/**
 * Register template path(s) to a container by id
 * @param {string} id - the container identifier to register templates to
 * @param {string|Array<string>} path - single template path or array of template paths
 */
export function registerTemplate(id, path) {
    if (!Object.prototype.hasOwnProperty.call(dict, id)) {
        dict[id] = {};
    }
    if (!Object.prototype.hasOwnProperty.call(dict[id], "templates")) {
        dict[id].templates = [];
    }
    if (Array.isArray(path)) {
        dict[id].templates = dict[id].templates.concat(path);
    }
    else {
        dict[id].templates.push(path);
    }
}

/**
 * Create a Vue mixin that provides container data as component data properties
 * @param {object} mapping - object mapping component data property names to container ids
 * @returns {object} Vue mixin object with data function that returns filtered container data
 */
export function dataMixin(mapping) {
    const mixin = {
        data: function() {
            const ob = Object.keys(mapping).reduce(function(acc, val) {
                const dataOb = dict[mapping[val]] ? dict[mapping[val]].data : [];
                if (Array.isArray(dataOb)) {
                    acc[val] = dataOb.filter(function(data) {
                        if (data && data.permission) {
                            return validateRead(data.permission);
                        }
                        return true;
                    });
                }
                else {
                    for (const key in dataOb) {
                        if (dataOb[key] && dataOb[key].permission) {
                            if (validateRead(dataOb[key].permission)) {
                                acc[val] = dataOb;
                            }
                        }
                        else {
                            acc[val] = dataOb;
                        }
                        break;
                    }
                }
                return acc;
            }, {});
            return ob;
        }
    };
    return mixin;
}

/**
 * Create a Vue mixin that provides container tabs as component data properties
 * @param {object} mapping - object mapping component data property names to container ids
 * @returns {object} Vue mixin object with data function that returns permission-filtered tabs
 */
export function tabsMixin(mapping) {
    const mixin = {
        data: function() {
            const ob = Object.keys(mapping).reduce(function(acc, val) {
                acc[val] = (dict[mapping[val]] ? dict[mapping[val]].tabs : []).filter(function(tab) {
                    if (tab.permission) {
                        return validateRead(tab.permission);
                    }
                    return validateGlobalAdmin();
                });
                return acc;
            }, {});
            return ob;
        }
    };
    return mixin;
}

/**
 * Get all registered routes from all containers
 * @returns {Array<object>} array of route objects with url and app_type properties
 */
export function getAllRoutes() {
    const routes = [];

    for (const id in dict) {
        if (dict[id].data) {
            for (let j = 0; j < dict[id].data.length; j++) {
                if (dict[id].data[j].url) {
                    routes.push({url: dict[id].data[j].url, app_type: dict[id].data[j].app_type});
                }
            }
        }
        if (dict[id].tabs) {
            for (let k = 0; k < dict[id].tabs.length; k++) {
                if (dict[id].tabs[k].route) {
                    routes.push({url: dict[id].tabs[k].route, app_type: dict[id].tabs[k].type});
                }
            }
        }
    }

    return routes;
}

/**
 * Get all mixins registered to the specified container ids
 * @param {Array<string>} ids - array of container identifiers
 * @returns {Array<object>} concatenated array of all mixins from the specified containers
 */
export function mixins(ids) {
    let result = [];

    ids.forEach(function(id) {
        const mix = dict[id] ? dict[id].mixins : [];
        result = result.concat(mix);
    });

    return result;
}

/**
 * Get all templates registered to the specified container ids
 * @param {Array<string>} ids - array of container identifiers
 * @returns {Array<string>} concatenated array of all template paths from the specified containers
 */
export function templates(ids) {
    let result = [];
    ids.forEach(function(id) {
        const template = dict[id] ? dict[id].templates : [];
        result = result.concat(template);
    });
    return result;
}

/**
 * Get all Vuex modules from tabs registered to the specified container ids
 * @param {Array<string>} ids - array of container identifiers
 * @returns {Array<object>} concatenated array of Vuex modules from permission-filtered tabs
 */
export function tabsVuex(ids) {
    let vuex = [];

    ids.forEach(function(id) {
        const tabs = (dict[id] ? dict[id].tabs : []).filter(function(tab) {
            if (tab.permission) {
                return validateRead(tab.permission);
            }
            return validateGlobalAdmin();
        });

        tabs.forEach(function(t) {
            if (t.vuex) {
                vuex = vuex.concat(t.vuex);
            }
        });
    });

    return vuex;
}