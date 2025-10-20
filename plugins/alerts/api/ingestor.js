
const common = require('../../../api/utils/common.js');
const log = common.log('alerts:ingestor');
const plugins = require('../../pluginManager.js');
const commonLib = require("./parts/common-lib.js");


(function() {
    const TRIGGER_BY_EVENT = Object.keys(commonLib.TRIGGERED_BY_EVENT).map(name => ({
        module: require("./alertModules/" + name + ".js"),
        name
    }));

    plugins.register("/i", async function(ob) {
        const events = ob.params?.qstring?.events;
        const app = ob.app;

        if (!events || !app) {
            return;
        }

        for (let { module, name } of TRIGGER_BY_EVENT) {
            if (name !== "crashes") {
                try {
                    await module.triggerByEvent({ events, app });
                }
                catch (err) {
                    log.e("Alert module '" + name + "' couldn't be triggered by event", err);
                }
            }
        }
    });
}());