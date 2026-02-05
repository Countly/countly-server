import { validateRead, validateGlobalAdmin } from "../countly.auth";
import { isPluginEnabled } from "../countly.helpers";
import { getGlobalStore } from './data/store.js';

/**
 * Get the container dict from Vuex store
 * @returns {Object} The container dict
 */
function getDict() {
    return getGlobalStore().state.countlyContainer.dict;
}

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

    const store = getGlobalStore();
    store.commit('countlyContainer/registerData', { id, value, type });
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

        const store = getGlobalStore();
        store.commit('countlyContainer/registerTab', { id, tab });
    }
}

/**
 * Register a Vue mixin to a container by id
 * @param {string} id - the container identifier to register the mixin to
 * @param {object} mixin - the Vue mixin object, may include pluginName property for plugin filtering
 */
export function registerMixin(id, mixin) {
    if (mixin && (!mixin.pluginName || isPluginEnabled(mixin.pluginName))) {
        const store = getGlobalStore();
        store.commit('countlyContainer/registerMixin', { id, mixin });
    }
}

/**
 * Register template path(s) to a container by id
 * @param {string} id - the container identifier to register templates to
 * @param {string|Array<string>} path - single template path or array of template paths
 */
export function registerTemplate(id, path) {
    const store = getGlobalStore();
    store.commit('countlyContainer/registerTemplate', { id, path });
}

/**
 * Create a Vue mixin that provides container data as component data properties
 * @param {object} mapping - object mapping component data property names to container ids
 * @returns {object} Vue mixin object with data function that returns filtered container data
 */
export function dataMixin(mapping) {
    const mixin = {
        data: function() {
            const dict = getDict();
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
            const dict = getDict();
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
    const dict = getDict();
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
    const dict = getDict();
    let result = [];

    ids.forEach(function(id) {
        const mix = (dict[id] && dict[id].mixins) ? dict[id].mixins : [];
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
    const dict = getDict();
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
    const dict = getDict();
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
