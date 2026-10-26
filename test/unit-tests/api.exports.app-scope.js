require('should');
const plugins = require('../../plugins/pluginManager.js');
const rights = require('../../api/utils/rights.js');
const exportsModule = require('../../api/parts/data/exports.js');
const { drillPreprocessQuery } = require('../../plugins/push/api/api-drill.js');

// /o/export/db exports the collections every app shares (events_data, drill_events) to any
// member, scoped to the member's apps. The query is dispatched to /drill/preprocess_query
// first, where listeners rewrite it in place, so the scope must be combined around the
// rewritten query, right before the read.

const OWN_APP = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_APP = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const member = { global_admin: false, permission: { _: { a: [OWN_APP], u: [] } } };
const globalAdmin = { global_admin: true };

const ROWS = [
    { _id: OWN_APP + '_e1_2026:10', tkip: true },
    { _id: OWN_APP + '_e2_2026:10' },
    { _id: OTHER_APP + '_e1_2026:10', tkip: true },
    { _id: OTHER_APP + '_e2_2026:10' }
];

/**
 * Value of a dotted path in a document
 * @param {Object} doc - document
 * @param {string} path - dotted path
 * @returns {*} value or undefined
 */
function valueAt(doc, path) {
    return path.split('.').reduce((v, part) => (v === undefined || v === null ? undefined : v[part]), doc);
}

/**
 * Whether a value satisfies one field condition, for the operators these exports produce
 * @param {*} value - document value
 * @param {*} cond - condition
 * @returns {boolean} match
 */
function matchesValue(value, cond) {
    const test = (c) => (c instanceof RegExp ? typeof value === 'string' && c.test(value) : JSON.stringify(value) === JSON.stringify(c));
    if (cond instanceof RegExp || cond === null || typeof cond !== 'object' || Array.isArray(cond)) {
        return test(cond);
    }
    const ops = Object.keys(cond);
    if (!ops.length || !ops.every(op => op.startsWith('$'))) {
        return test(cond);
    }
    return ops.every(function(op) {
        const arg = cond[op];
        switch (op) {
        case '$in': return arg.some(test);
        case '$nin': return !arg.some(test);
        case '$exists': return (value !== undefined) === !!arg;
        case '$regex': return typeof value === 'string' && new RegExp(arg).test(value);
        case '$ne': return !test(arg);
        default: throw new Error('operator not supported by the test matcher: ' + op);
        }
    });
}

/**
 * Whether a document matches a Mongo-style query. Throws on a query MongoDB itself refuses
 * (a $and/$or entry that is not a document), so a refused query is not counted as zero rows.
 * @param {Object} doc - document
 * @param {Object} query - query
 * @returns {boolean} match
 */
function matches(doc, query) {
    if (query === null || typeof query !== 'object' || Array.isArray(query)) {
        throw new Error('query must be a document');
    }
    return Object.keys(query).every(function(key) {
        if (key === '$and' || key === '$or') {
            if (!Array.isArray(query[key]) || !query[key].length) {
                throw new Error(key + ' must be a non-empty array');
            }
            return key === '$and' ? query[key].every(q => matches(doc, q)) : query[key].some(q => matches(doc, q));
        }
        return matchesValue(valueAt(doc, key), query[key]);
    });
}

/**
 * A database whose find() resolves with the query it received
 * @returns {Object} {db, found} - found resolves with the query given to find()
 */
function capturingDb() {
    let resolveFound;
    const found = new Promise(resolve => {
        resolveFound = resolve;
    });
    const cursor = {
        map: () => cursor,
        sort: () => cursor,
        skip: () => cursor,
        limit: () => cursor,
        toArray: (cb) => cb(null, []),
        stream: () => ({ on: () => {}, once: () => {}, pipe: () => {} })
    };
    const db = {
        collection: () => ({
            find: (query) => {
                resolveFound(query);
                return cursor;
            }
        })
    };
    return { db, found };
}

/**
 * Run the export service with the scope the route computes for a member
 * @param {Object} who - member
 * @param {Object} query - parsed user query
 * @returns {Promise<Object[]>} the fixture rows the query given to find() selects
 */
async function exportRows(who, query) {
    const { db, found } = capturingDb();
    exportsModule.fromDatabase({
        db: db,
        params: { qstring: { app_id: OWN_APP }, member: who },
        collection: 'events_data',
        query: query,
        appFilter: rights.getExportAppFilter(who, 'countly', 'events_data'),
        output: () => {}
    });
    const finalQuery = await found;
    return ROWS.filter(row => matches(row, finalQuery));
}

describe('DB export app scope after /drill/preprocess_query', function() {
    // the server's push plugin is the /drill/preprocess_query listener on these exports
    const realDispatch = plugins.dispatch;
    before(function() {
        plugins.dispatch = function(event, ob, callback) {
            if (event === '/drill/preprocess_query') {
                Promise.resolve(drillPreprocessQuery(ob)).then(() => callback && callback());
                return true;
            }
            return realDispatch.apply(this, arguments);
        };
    });
    after(function() {
        plugins.dispatch = realDispatch;
    });

    describe('rights.getExportAppFilter', function() {
        it('scopes a member on events_data and drill_events', function() {
            rights.getExportAppFilter(member, 'countly', 'events_data')._id.$in.length.should.equal(1);
            rights.getExportAppFilter(member, 'countly_drill', 'drill_events').a.$in.should.eql([OWN_APP]);
        });
        it('does not scope a global admin, on either collection', function() {
            (rights.getExportAppFilter(globalAdmin, 'countly', 'events_data') === null).should.be.true();
            (rights.getExportAppFilter(globalAdmin, 'countly_drill', 'drill_events') === null).should.be.true();
        });
        it('does not scope other collections', function() {
            (rights.getExportAppFilter(member, 'countly', 'members') === null).should.be.true();
        });
        it('combines the scope around the query, keeping the query as given', function() {
            const query = { $or: [{ x: 1 }] };
            rights.scopeQueryToApps({ a: 1 }, query).should.eql({ $and: [{ a: 1 }, { $or: [{ x: 1 }] }] });
            rights.scopeQueryToApps(null, query).should.equal(query);
        });
    });

    describe('/o/export/db', function() {
        it('returns no other app rows for a member with a push $nin condition and an _id clause', async function() {
            const rows = await exportRows(member, { _id: { $regex: '_' }, push: { $nin: ['tkip'] } });
            rows.map(r => r._id).should.eql([OWN_APP + '_e2_2026:10']);
        });
        it('returns no other app rows for a member with a push condition and a $or', async function() {
            const rows = await exportRows(member, { $or: [{ _id: { $regex: '_e1_' } }, { _id: { $regex: '_e2_' } }], push: { $in: ['tkip'] } });
            rows.map(r => r._id).should.eql([OWN_APP + '_e1_2026:10']);
        });
        it('returns no other app rows when the query names the other app', async function() {
            (await exportRows(member, { _id: { $regex: '^' + OTHER_APP } })).should.have.length(0);
        });
        it('still exports the member\'s own rows, with push filters applied', async function() {
            (await exportRows(member, { push: { $in: ['tkip'] } })).map(r => r._id).should.eql([OWN_APP + '_e1_2026:10']);
            (await exportRows(member, { push: { $nin: ['tkip'] } })).map(r => r._id).should.eql([OWN_APP + '_e2_2026:10']);
            (await exportRows(member, {})).should.have.length(2);
        });
        it('leaves a global admin unscoped', async function() {
            (await exportRows(globalAdmin, {})).should.have.length(4);
            (await exportRows(globalAdmin, { push: { $in: ['tkip'] } })).map(r => r._id).should.eql([OWN_APP + '_e1_2026:10', OTHER_APP + '_e1_2026:10']);
        });
    });

    describe('push listener', function() {
        it('adds its conditions to an existing $and and keeps an existing $or', function() {
            const query = { $and: [{ x: 1 }], $or: [{ y: 1 }, { y: 2 }], push: { $nin: ['tkid'], $in: ['tkip'] } };
            drillPreprocessQuery({ query });
            query.should.eql({
                $and: [{ x: 1 }, { $or: [{ tkid: false }, { tkid: { $exists: false } }] }, { $or: [{ tkip: true }] }],
                $or: [{ y: 1 }, { y: 2 }]
            });
        });
    });
});
