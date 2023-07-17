var plugins = require('../../../../plugins/pluginManager');
const dashboard = require('../../../../plugins/dashboards/api/parts/dashboards.js');

async function recheckFunnelWidgets(countlyDb) {
    console.log("Detecting deleted data for funnels...");

    const widgets = await countlyDb.collection('widgets').find({ widget_type: 'funnels', funnel_type: { $exists: true, $ne: [] } }, { funnel_type: 1 }).toArray();
    if (!widgets || !widgets.length) {
        console.log("No widgets found.");
        return;
    }
    const funnelIdsInWidgets = widgets.map(widget => widget.funnel_type[0].split('***')[1]);
    const existingFunnels = await countlyDb.collection('funnels').find({ _id: { $in: funnelIdsInWidgets } }, { _id: 1, app_id: 1 }).toArray();
    if (!existingFunnels || !existingFunnels.length) {
        console.log("No funnels found.");
        return;
    }
    const formattedExistingFunnels = existingFunnels.map(funnel => funnel.app_id + "***" + funnel._id.toString());
    const missingFunnelIds = widgets.filter(function(result) {
        return !formattedExistingFunnels.includes(result.funnel_type[0]);
    }).map(function(result) {
        return result.funnel_type[0];
    });

    if (missingFunnelIds.length) {
        const matchOperator = {
            widget_type: "funnels",
            "funnel_type": {
                $in: missingFunnelIds
            }
        };

        try {
           return await dashboard.removeDeletedRecordsFromWidgets({member: {username: 'unknown'}}, matchOperator, countlyDb);
        }
        catch (error) {
            console.log('Error while sending a request: ', error);
        }
    }
    else {
        console.log("No deleted funnels found in widgets.");
    }
}

async function recheckFormulasWidgets(countlyDb) {
    console.log("Detecting deleted data for formulas...");

    const widgets = await countlyDb.collection('widgets').find({ widget_type: 'formulas', cmetric_refs: { $exists: true, $ne: [] } }, { "cmetric_refs._id": 1 }).toArray();
    if (!widgets || !widgets.length) {
        console.log("No widgets found.");
        return;
    }
    const ids = widgets.map(item => countlyDb.ObjectID(item.cmetric_refs[0]._id));
    const existingFormulas = await countlyDb.collection('calculated_metrics').find({ _id: { $in: ids } }, { _id: 1 }).toArray();
    if (!existingFormulas || !existingFormulas.length) {
        console.log("No formulas found.");
        return;
    }
    const missingFormulasIds = widgets.filter(widget => {
        return !existingFormulas.some(formula => String(formula._id) === widget.cmetric_refs[0]._id);
    }).map(function(result) {
        return result.cmetric_refs[0]._id;
    });

    if (missingFormulasIds.length) {
        const matchOperator = {
            widget_type: "formulas",
            "cmetric_refs": {
                $elemMatch: {
                    _id: {
                        $in: missingFormulasIds
                    }
                }
            }
        };

        try {
            return await dashboard.removeDeletedRecordsFromWidgets({member: {username: 'unknown'}}, matchOperator, countlyDb);
        }
        catch (error) {
            console.log('Error while sending a request: ', error);
        }
    }
    else {
        console.log("No deleted formulas found in widgets.");
    }
}

async function recheckDrillWidgets(countlyDb) {
    console.log("Detecting deleted data for drill...");
    const matchOperator = {
        "widget_type": "drill",
        "drill_query": { $size: 0 }
    };

    try {
        return await dashboard.removeDeletedRecordsFromWidgets({member: {username: 'unknown'}}, matchOperator, countlyDb);
    }
    catch (error) {
        console.log('Error while sending a request: ', error);
    }
}

plugins.dbConnection().then(async(countlyDb) => {
    try {
        await recheckFunnelWidgets(countlyDb);
    }
    catch (error) {
        console.log('Error in recheckFunnelWidgets:', error);
    }

    try {
        await recheckFormulasWidgets(countlyDb);
    }
    catch (error) {
        console.log('Error in recheckFormulasWidgets:', error);
    }

    try {
        await recheckDrillWidgets(countlyDb);
    }
    catch (error) {
        console.log('Error in recheckDrillWidgets:', error);
    }
    finally {
        countlyDb.close();
    }
});
