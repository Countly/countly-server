// Proxy file - re-exports from TypeScript implementation
const {
    getDateStringProjection,
    getUniqueUserModel,
    aggregatedSessionData,
    getAggregatedData,
    getSegmentedEventModelData,
    getViewsTableData,
    segmentValuesForPeriod,
    getDrillCursorForExport
} = require('./mongodbQueries.ts');

module.exports = {
    getDateStringProjection,
    getUniqueUserModel,
    aggregatedSessionData,
    getAggregatedData,
    getSegmentedEventModelData,
    getViewsTableData,
    segmentValuesForPeriod,
    getDrillCursorForExport
};
