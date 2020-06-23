var log = require('../api/utils/log.js'),
    logSafeLoader = log('plugins:safeloader');
/**
 * 
 * @param {string} fixStrategy {disableChildren|enableParents}
 */
var analyzeAndFixDependencies = function(plugins, fixStrategy) {
    const DEP_ROOT = "___DEP_ROOT___";
    var errors = {};
    var dpcs = {
        [DEP_ROOT]:{
            children: {}
        }
    };

    fixStrategy = fixStrategy || "disableChildren";
    if (["disableChildren", "enableParents"].indexOf(fixStrategy) === -1) {
        logSafeLoader.e("Invalid fixStrategy (" + fixStrategy + ") for analyzeAndFixDependencies.");
        return null;
    }

    function _loadPluginMeta(pName){
        try {
            var pkgInfo = require("./" + pName + "/package.json");
            var currentDpcs = pkgInfo.cly_dependencies || {};
            if (Object.keys(currentDpcs).length === 0) {
                // Zero-dependency plugins are linked to an imaginary root, where traverse starts at
                currentDpcs[DEP_ROOT] = true;
            }
            dpcs[pName] = {parents: currentDpcs, children:{}};
            return true;
        }
        catch (ex) {
            errors[pName] = {"reason": "not_found"};
            return false;
        }
    }

    var loadQueue = JSON.parse(JSON.stringify(plugins));

    while (loadQueue.length > 0) {
        var name = loadQueue.shift();
        if (!Object.prototype.hasOwnProperty.call(dpcs, name)) {
            if(_loadPluginMeta(name) && fixStrategy === "enableParents") {
                // Register parents before error analysis
                for (var parentName in dpcs[name].parents){
                    loadQueue.push(parentName);
                }
            }
        }
    }

    for(var name in dpcs){
        for (var parentName in dpcs[name].parents){
            if (!Object.prototype.hasOwnProperty.call(dpcs, parentName)) {
                if (fixStrategy === "enableParents") {
                    // If dependency record is not found even at this point, it means dependency doesn't exist under plugins.
                    errors[name] = {"reason": "parent_not_found", "cly_dependencies": dpcs[name].parents};
                }
                else { //else if (fixStrategy === "disableChildren") {
                    errors[name] = {"reason": "child_disabled", "cly_dependencies": dpcs[name].parents};
                }
                break;
            }
            else {
                dpcs[parentName].children[name] = true;
            }
        }
    }

    var fixedPlugins = []; 
    var visited = new Set();

    function _traverse(pluginName) {

        if (visited.has(pluginName)) {
            return;
        }

        for (var parentName in dpcs[pluginName].parents){
            if (!visited.has(parentName)) {
                // Plugin has to wait for another parent(s) to be added first.
                return;
            }
        }

        // If all parents were added before, there is nothing blocking plugin itself.
        // So we add it too.
        if (pluginName !== DEP_ROOT) {
            fixedPlugins.push(pluginName);
        }
        visited.add(pluginName);

        // As we add the new plugin, we can traverse its children.  
        for (var childName in dpcs[pluginName].children){
            _traverse(childName);
        }
    }

    _traverse(DEP_ROOT);

    for (var plugin in dpcs) {
        if (plugin === DEP_ROOT) {
            continue;
        }
        if (fixedPlugins.indexOf(plugin) === -1 && !Object.prototype.hasOwnProperty.call(errors, plugin)) {
            errors[plugin] = {"reason": "parent_enable_failed", "cly_dependencies": dpcs[plugin].parents};
        }
    };

    if (Object.keys(errors).length > 0) {
        logSafeLoader.e("Loaded plugins:\n", fixedPlugins);
        logSafeLoader.e("Safe loader couldn't load following plugins:\n", errors);
    }
    else {
        logSafeLoader.i("Loaded successfully.");
    }
    return fixedPlugins;
}

exports.load = analyzeAndFixDependencies;