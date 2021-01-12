var log = require('../api/utils/log.js'),
    _ = require('lodash'),
    fs = require('fs');

const CLY_ROOT = "___CLY_ROOT___";

/**
 * Decorates option object
 * 
 * @param {object} options Input options object
 * @returns {object} Output options object
 */
function getOptions(options) {
    options = options || {};
    if (options.env === "cli") {
        options.logger = {
            e: console.log,
            i: console.log,
            w: console.log
        };
    }
    else {
        options.logger = options.logger || log('plugins:dependencies');
    }
    options.discoveryStrategy = options.discoveryStrategy || "disableChildren";
    return options;
}

/**
 * Extends the dependencies graph with either ancestors or descendants of the given plugin
 * 
 * @param {object} _graph Dependencies graph 
 * @param {String} code Plugin id
 * @param {String} direction Relative direction (up|down)
 * @returns {undefined} nothing
 */
function discoverRelativePlugins(_graph, code, direction) {

    if (!Object.prototype.hasOwnProperty.call(_graph, code)) {
        return [];
    }

    direction = direction || "up";

    if (Object.prototype.hasOwnProperty.call(_graph[code], direction)) {
        return _graph[code][direction];
    }

    var queue = [code],
        visited = {},
        relativeType = "parents";
    if (direction !== "up") {
        relativeType = "children";
    }
    while (queue.length > 0) {
        var current = queue.pop();
        if (Object.prototype.hasOwnProperty.call(visited, current)) {
            continue;
        }

        if (!_graph[current]) {
            visited[current] = 1;
            continue;
        }

        for (var item in _graph[current][relativeType]) {
            queue.push(item);
        }
        visited[current] = 1;
    }
    var relatives = [];

    delete visited[CLY_ROOT];

    for (var itemCode in visited) {
        if (itemCode !== code) {
            relatives.push(itemCode);
        }
    }

    _graph[code][direction] = relatives;
}

/**
 * Returns a dependency graph of the provided plugins list.
 * 
 * If the discovery strategy is "disableChildren", then the returned graph will be a subset of the original dependencies. 
 * 
 * For instance,
 * Let A <- B (plugin B depends on Plugin A);
 * If A is disabled, A won't be included in the graph, but only B will be. This will cause an unmet dependency error,
 * and reported via the errors object.
 * 
 * In "enableParents" case, however, Plugin A (parent) will be enabled, so the graph will be complete. 
 * 
 * This function may report different types of errors; which are generally caused by cyclic dependencies, absent plugins, etc.
 * 
 * @param {Array} plugins We use this array of plugin names to create dependency graph.  
 * @param {object} options Options object
 * @returns {Object} Returns an object with dpcs and errors fields
 */
function getDependencies(plugins, options) {
    var errors = {},
        dpcs = {
            [CLY_ROOT]: {
                children: {}
            }
        };

    var {logger, discoveryStrategy} = getOptions(options);

    if (["disableChildren", "enableParents"].indexOf(discoveryStrategy) === -1) {
        logger.e(`Invalid discoveryStrategy (${discoveryStrategy}) for analyzeAndFixDependencies.`);
        return null;
    }

    var _loadPluginMeta = function(pName) {
        try {
            var pkgInfo = require("./" + pName + "/package.json");
            var currentDpcs = pkgInfo.cly_dependencies || {};
            if (Object.keys(currentDpcs).length === 0) {
                // Zero-dependency plugins are linked to an imaginary root, where traverse starts at
                currentDpcs[CLY_ROOT] = true;
            }
            dpcs[pName] = {parents: currentDpcs, children: {}};
            return true;
        }
        catch (ex) {
            errors[pName] = {"reason": "not_found"};
            return false;
        }
    };

    var loadQueue = JSON.parse(JSON.stringify(plugins));

    while (loadQueue.length > 0) {
        var name = loadQueue.shift();
        if (!Object.prototype.hasOwnProperty.call(dpcs, name)) {
            if (_loadPluginMeta(name) && discoveryStrategy === "enableParents") {
                // Register parents before error analysis
                for (var parentName in dpcs[name].parents) {
                    loadQueue.push(parentName);
                }
            }
        }
    }

    for (var dname in dpcs) {
        for (var pname in dpcs[dname].parents) {
            if (!Object.prototype.hasOwnProperty.call(dpcs, pname)) {
                if (discoveryStrategy === "enableParents") {
                    // If dependency record is not found even at this point, it means dependency doesn't exist under plugins.
                    errors[dname] = {"reason": "parent_not_found", "cly_dependencies": dpcs[dname].parents};
                }
                else { //else if (discoveryStrategy === "disableChildren") {
                    errors[dname] = {"reason": "child_disabled", "cly_dependencies": dpcs[dname].parents};
                }
                break;
            }
            else {
                dpcs[pname].children[dname] = true;
            }
        }
    }

    for (var center in dpcs) {
        discoverRelativePlugins(dpcs, center, "up");
        discoverRelativePlugins(dpcs, center, "down");
    }

    return {dpcs, errors};
}

/**
 * Fixes the order of plugins, enables/disables when there are broken dependencies
 * 
 * @param {Array} plugins Plugin List 
 * @param {Object} options Options object
 * @returns {Array} Fixed list of the plugins
 */
var getFixedPluginList = function(plugins, options) {

    options = getOptions(options);

    var {dpcs, errors} = getDependencies(plugins, options),
        fixedPlugins = [],
        visited = new Set(),
        logger = options.logger;

    var _traverse = function(pluginName) {

        if (visited.has(pluginName)) {
            return;
        }

        for (var parentName in dpcs[pluginName].parents) {
            if (!visited.has(parentName)) {
                // Plugin has to wait for another parent(s) to be added first.
                return;
            }
        }

        // If all parents were added before, there is nothing blocking plugin itself.
        // So we add it too.
        if (pluginName !== CLY_ROOT) {
            fixedPlugins.push(pluginName);
        }
        visited.add(pluginName);

        // As we add the new plugin, we can traverse its children.  
        for (var childName in dpcs[pluginName].children) {
            _traverse(childName);
        }
    };

    _traverse(CLY_ROOT);

    for (var plugin in dpcs) {
        if (plugin === CLY_ROOT) {
            continue;
        }
        if (fixedPlugins.indexOf(plugin) === -1 && !Object.prototype.hasOwnProperty.call(errors, plugin)) {
            errors[plugin] = {"reason": "parent_enable_failed", "cly_dependencies": dpcs[plugin].parents};
        }
    }

    if (fixedPlugins.indexOf('dashboards') !== -1) {
        fixedPlugins.splice(fixedPlugins.indexOf('dashboards'), 1);
        fixedPlugins.push('dashboards');
    }

    if (Object.keys(errors).length > 0) {
        logger.e("Loaded plugins:\n", fixedPlugins);
        logger.e("Safe loader couldn't load following plugins:\n", errors);
    }
    else {
        logger.i("Loaded successfully.");
    }

    if (!_.isEqual(plugins, fixedPlugins)) {
        logger.w("Plugin list has changed.");
        logger.w("Old Plugins >>>", JSON.stringify(plugins));
        logger.w("New Plugins >>>", JSON.stringify(fixedPlugins));

        if (options.overwrite) {
            if (fs.existsSync(options.overwrite)) {
                logger.w("The old version will be overwritten.");
                try {
                    fs.renameSync(options.overwrite, options.overwrite + ".autobkp");
                    try {
                        fs.writeFileSync(options.overwrite, JSON.stringify(fixedPlugins));
                    }
                    catch (newWriteErr) {
                        logger.e(`Fixed ${options.overwrite} couldn't be written. Please check the original file.`, newWriteErr);
                    }
                }
                catch (renameErr) {
                    logger.e(`Old ${options.overwrite} couldn't be renamed. Overwrite was aborted.`, renameErr);
                }
            }
        }
    }
    else {
        logger.i("Plugin list is OK.");
    }

    return fixedPlugins;
};

exports.getDependencies = getDependencies;
exports.getFixedPluginList = getFixedPluginList;
