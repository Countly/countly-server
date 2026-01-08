/**
 * ClickHouse table registry - frozen/immutable at runtime
 * Maps table names to their database configurations
 *
 * Usage:
 *   const TABLES = require('./tables');
 *   const db = TABLES.drill_events.db; // 'countly_drill'
 */
module.exports = Object.freeze({
    drill_events: Object.freeze({ db: 'countly_drill' }),
    drill_snapshots: Object.freeze({ db: 'countly_drill' }),
    uid_map: Object.freeze({ db: 'identity' })
});
