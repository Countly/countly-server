var log = require('../api/utils/log.js'),
    _ = require('lodash'),
    fs = require('fs'),
    logSafeLoader = log('plugins:safeloader');
/**
 * 
 * @param {string} fixStrategy {disableChildren|enableParents}
 */
var analyzeAndFixDependencies = function(plugins, fixOptions) {
    const DEP_ROOT = "___DEP_ROOT___";
    var errors = {};
    var dpcs = {
        [DEP_ROOT]:{
            children: {}
        }
    };

    fixOptions = fixOptions || {};

    fixStrategy = fixOptions.fixStrategy || "disableChildren";
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

    if (!_.isEqual(plugins, fixedPlugins)) {
        logSafeLoader.w("Plugin list has changed.");
        logSafeLoader.w("Old Plugins >>>", JSON.stringify(plugins));
        logSafeLoader.w("New Plugins >>>", JSON.stringify(fixedPlugins));

        if (fixOptions.overwrite) {
            if (fs.existsSync(fixOptions.overwrite)) {
                logSafeLoader.w("The old version will be overwritten.");
                try {
                    fs.renameSync(fixOptions.overwrite, fixOptions.overwrite + ".autobkp");
                    try {
                        fs.writeFileSync(fixOptions.overwrite, JSON.stringify(fixedPlugins));
                    }
                    catch (newWriteErr) {
                        logSafeLoader.e(`Fixed ${fixOptions.overwrite} couldn't be written. Please check the original file.`, newWriteErr);
                    }
                }
                catch (renameErr) {
                    logSafeLoader.e(`Old ${fixOptions.overwrite} couldn't be renamed. Overwrite was aborted.`, renameErr);
                }
            }
        }
    }
    else {
        logSafeLoader.i("Plugin list is OK.");
    }

    return fixedPlugins;
}

exports.load = analyzeAndFixDependencies;