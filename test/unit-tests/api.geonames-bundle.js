'use strict';

const assert = require('assert');
const fs = require('fs');
const importer = require('../../bin/offline-geocoder/scripts/import_geonames_mongodb.js');

describe('geonames bundle: which copy wins', function() {
    const manifest = {fetched: '2026-08-20'};
    const want = 'bbbb';

    it('keeps a bundle the database fetched later', function() {
        assert.strictEqual(
            importer.keepDatabaseBundle({fetched: '2026-08-21', fingerprint: 'aaaa'}, manifest, want),
            true
        );
    });

    it('loads this image\'s bundle when the database holds an older one', function() {
        assert.strictEqual(
            importer.keepDatabaseBundle({fetched: '2026-08-19', fingerprint: 'zzzz'}, manifest, want),
            false
        );
    });

    // Two images built the same day from different upstream snapshots. The date
    // cannot order them, so before the tie-break each saw the other as "different
    // — reloading" and overwrote it: a same-version rollout reloaded 170k rows on
    // every restart, forever, and which bundle was live depended on start order.
    it('breaks a same-day tie the same way regardless of which pod asks', function() {
        const higher = {fetched: '2026-08-20', fingerprint: 'cccc'};
        const lower = {fetched: '2026-08-20', fingerprint: 'aaaa'};

        // The pod carrying 'bbbb' meeting a database at 'cccc' stands down...
        assert.strictEqual(importer.keepDatabaseBundle(higher, manifest, want), true);
        // ...and the pod carrying 'bbbb' meeting a database at 'aaaa' takes over.
        assert.strictEqual(importer.keepDatabaseBundle(lower, manifest, want), false);
        // Either way every pod ends up agreeing on 'cccc'.
    });

    it('does not stand down for a same-day bundle with no fingerprint recorded', function() {
        assert.strictEqual(
            importer.keepDatabaseBundle({fetched: '2026-08-20'}, manifest, want),
            false
        );
    });
});

describe('geonames bundle: swapping a new bundle into place', function() {
    const os = require('os');
    const path = require('path');
    const updater = require('../../bin/offline-geocoder/scripts/update_geonames_bundle.js');
    const FILES = ['cities.tsv.gz', 'MANIFEST.json'];
    let dir;

    beforeEach(function() {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'geonames-swap-'));
    });

    afterEach(function() {
        fs.rmSync(dir, {recursive: true, force: true});
    });

    /**
     * Read the live bundle directory as {name: contents}.
     * @returns {object} the files currently in place
     */
    function live() {
        const out = {};
        for (const name of fs.readdirSync(dir).filter(n => !n.startsWith('.'))) {
            out[name] = fs.readFileSync(path.join(dir, name), 'utf8');
        }
        return out;
    }

    /**
     * Stage a partial new bundle: everything in FILES except one name.
     * @param {string} missing - the file to leave out, so its rename throws
     * @returns {string} the staging directory
     */
    function stagePartial(missing) {
        const staging = fs.mkdtempSync(path.join(dir, '.staging-'));
        for (const name of FILES.filter(n => n !== missing)) {
            fs.writeFileSync(path.join(staging, name), 'NEW ' + name);
        }
        return staging;
    }

    // The OS installers run the updater straight into the committed bundle
    // directory and are documented to fall back to it when the update fails. A
    // half-finished swap leaves new data files beside the old MANIFEST.json,
    // which the importer rejects on its digests — so the fallback has nothing to
    // fall back to and set -e aborts the install.
    it('restores the committed bundle when a rename fails partway', function() {
        for (const name of FILES) {
            fs.writeFileSync(path.join(dir, name), 'OLD ' + name);
        }
        const staging = stagePartial('MANIFEST.json');

        assert.throws(() => updater.swapIntoBundleDir(staging, FILES, dir));

        assert.deepStrictEqual(live(), {
            'cities.tsv.gz': 'OLD cities.tsv.gz',
            'MANIFEST.json': 'OLD MANIFEST.json'
        });
        assert.strictEqual(
            fs.readdirSync(dir).filter(n => n.startsWith('.backup-')).length, 0,
            'the backup directory must not be left behind'
        );
    });

    // The in-process rollback above only covers an exception. SIGKILL, an OOM
    // kill or the host losing power between two renames leaves exactly the mixed
    // state it exists to prevent, so recovery also runs on the next invocation.
    it('restores the committed bundle after the process is killed mid-swap', function() {
        fs.writeFileSync(path.join(dir, 'cities.tsv.gz'), 'NEW cities.tsv.gz');
        fs.writeFileSync(path.join(dir, 'MANIFEST.json'), 'OLD MANIFEST.json');
        const backup = fs.mkdtempSync(path.join(dir, '.backup-'));
        fs.writeFileSync(path.join(backup, 'cities.tsv.gz'), 'OLD cities.tsv.gz');

        updater.recoverInterruptedSwap(dir);

        assert.deepStrictEqual(live(), {
            'cities.tsv.gz': 'OLD cities.tsv.gz',
            'MANIFEST.json': 'OLD MANIFEST.json'
        });
        assert.strictEqual(fs.readdirSync(dir).filter(n => n.startsWith('.backup-')).length, 0);
    });

    // ...but a backup marked complete is only litter. Undoing it would throw away
    // a successful update every time the process died in that one-syscall window.
    it('keeps the new bundle when the kill came after the swap finished', function() {
        for (const name of FILES) {
            fs.writeFileSync(path.join(dir, name), 'NEW ' + name);
        }
        const backup = fs.mkdtempSync(path.join(dir, '.backup-'));
        for (const name of FILES) {
            fs.writeFileSync(path.join(backup, name), 'OLD ' + name);
        }
        fs.writeFileSync(path.join(backup, updater.SWAP_DONE), '');

        updater.recoverInterruptedSwap(dir);

        assert.deepStrictEqual(live(), {
            'cities.tsv.gz': 'NEW cities.tsv.gz',
            'MANIFEST.json': 'NEW MANIFEST.json'
        });
        assert.strictEqual(fs.readdirSync(dir).filter(n => n.startsWith('.backup-')).length, 0);
    });
});

describe('geonames bundle: is the loaded data actually usable', function() {
    const importer = require('../../bin/offline-geocoder/scripts/import_geonames_mongodb.js');

    // Names MongoDB generates for the createIndex calls in loadBundle(). Verified
    // against a loaded database; if loadBundle ever changes an index, a stale name
    // here would make the health check demand a full 170k reload on every start.
    const REAL_INDEXES = {
        geocoder_coordinates: ['_id_', 'latitude_1_longitude_1', 'feature_id_1'],
        geocoder_features: ['_id_', 'id_1', 'name_1_country_id_1'],
        geocoder_admin1: ['_id_', 'country_id_1_id_1'],
        geocoder_countries: ['_id_', 'id_1']
    };
    const MANIFEST = {
        files: {
            'cities.tsv.gz': {rows: 170852},
            'admin1.tsv.gz': {rows: 3865},
            'countries.tsv.gz': {rows: 252}
        }
    };

    /**
     * Minimal db stand-in: whatever counts and index names it is given.
     * @param {object} overrides - {collectionName: {count, indexes}}
     * @returns {object} a db-like object with collection()
     */
    function fakeDb(overrides = {}) {
        return {
            collection(name) {
                const rows = {
                    geocoder_coordinates: 170852,
                    geocoder_features: 170852,
                    geocoder_admin1: 3865,
                    geocoder_countries: 252
                };
                const over = overrides[name] || {};
                return {
                    countDocuments: async() => (
                        over.count === undefined ? rows[name] : over.count
                    ),
                    indexes: async() => (over.indexes || REAL_INDEXES[name]).map(n => ({name: n}))
                };
            }
        };
    }

    it('reports nothing missing for a healthy load', async function() {
        assert.deepStrictEqual(await importer.missingCollections(fakeDb(), MANIFEST), []);
    });

    it('reports a collection that lost its rows', async function() {
        const bad = await importer.missingCollections(fakeDb({geocoder_features: {count: 0}}), MANIFEST);
        assert.deepStrictEqual(bad, ['geocoder_features']);
    });

    // The manifest's counts are the real counts of the bundle files, so for our
    // own generation any difference is damage — a restore that lost part of a
    // collection must trigger the reload. A different generation we keep can
    // only be asked to be non-empty.
    it('holds our own generation to the manifest counts exactly, a kept one only to non-empty', async function() {
        const nicked = {geocoder_coordinates: {count: 170852 - 5}};
        const exact = await importer.missingCollections(fakeDb(nicked), MANIFEST, true);
        assert.strictEqual(exact.length, 1);
        assert.ok(/geocoder_coordinates \(170847 rows, expected 170852\)/.test(exact[0]), exact[0]);
        assert.deepStrictEqual(await importer.missingCollections(fakeDb(nicked), MANIFEST), []);
    });

    // Rows present is not the same as usable. Reverse geocoding range-scans
    // latitude/longitude over ~170k coordinates and then joins; without that index
    // every GPS lookup becomes a collection scan, silently and for good, because
    // loading the bundle is the only thing that recreates it.
    it('reports a collection that kept its rows but lost an index', async function() {
        const bad = await importer.missingCollections(
            fakeDb({geocoder_coordinates: {indexes: ['_id_', 'feature_id_1']}}),
            MANIFEST
        );
        assert.strictEqual(bad.length, 1);
        assert.ok(
            /geocoder_coordinates.*latitude_1_longitude_1/.test(bad[0]),
            `expected the missing index to be named: ${bad[0]}`
        );
    });
});

describe('geonames bundle: credentials must not reach the image or the logs', function() {
    const updater = require('../../bin/offline-geocoder/scripts/update_geonames_bundle.js');

    // GEONAMES_BASE_URL is documented as an internal-mirror override, and a mirror
    // may be authenticated. The raw value reached MANIFEST.json — which Docker
    // copies into the runtime image and the OS installers leave in the installed
    // bundle — and the build logs.
    // A mirror can embed its credential ANYWHERE — userinfo, query value, a
    // path segment, the fragment — and path segments have no name/value
    // structure to redact selectively. Anything that is not the known public
    // upstream is reduced to its origin.
    it('reduces custom mirrors to their origin', function() {
        assert.strictEqual(
            updater.redactUrl('https://user:token@mirror.example/export/dump'),
            'https://mirror.example'
        );
        assert.strictEqual(
            updater.redactUrl('https://mirror.example/dump?apikey=s3cret&x=1'),
            'https://mirror.example'
        );
        assert.strictEqual(
            updater.redactUrl('https://mirror.example/T0KEN/dump#frag'),
            'https://mirror.example'
        );
        assert.strictEqual(
            updater.redactUrl('http://internal-mirror:8080/geonames'),
            'http://internal-mirror:8080'
        );
    });

    // The default has to survive untouched, or every bundle rebuild would rewrite
    // MANIFEST.json's source and show up as a spurious diff — and per-file
    // download logging stays readable for it.
    it('leaves the known public upstream exactly as it is', function() {
        assert.strictEqual(
            updater.redactUrl('https://download.geonames.org/export/dump'),
            'https://download.geonames.org/export/dump'
        );
        assert.strictEqual(
            updater.redactUrl('https://download.geonames.org/export/dump/cities1000.zip'),
            'https://download.geonames.org/export/dump/cities1000.zip'
        );
    });

    // The trusted prefix must not become a smuggling lane: a credential appended
    // to the public upstream (query, fragment, userinfo) rides a URL the prefix
    // check would otherwise call inherently safe.
    it('redacts credentials appended to the public upstream', function() {
        assert.strictEqual(
            updater.redactUrl('https://download.geonames.org/export/dump/?token=SECRET'),
            'https://download.geonames.org'
        );
        assert.strictEqual(
            updater.redactUrl('https://x:y@download.geonames.org/export/dump'),
            'https://download.geonames.org'
        );
        assert.strictEqual(
            updater.redactUrl('https://download.geonames.org/export/dump#SECRET'),
            'https://download.geonames.org'
        );
        // a subpath is as good a hiding place as a query — only the exact
        // upstream URLs this script itself downloads are preserved
        assert.strictEqual(
            updater.redactUrl('https://download.geonames.org/export/dump/token/SECRET'),
            'https://download.geonames.org'
        );
    });

    it('refuses to echo something it cannot parse', function() {
        assert.strictEqual(updater.redactUrl('not a url at all'), '<unparseable url>');
    });
});

describe('geonames bundle: ordering by date, not by string', function() {
    const importer = require('../../bin/offline-geocoder/scripts/import_geonames_mongodb.js');
    const ours = {fetched: '2026-08-29'};

    // The updater always writes YYYY-MM-DD, but COUNTLY_GEONAMES_BUNDLE_DIR lets an
    // operator supply a manifest with any parseable form — and "August 28, 2026"
    // sorts BEFORE "2026-08-29" as a string while being a later date. Sentinels
    // already in databases can hold such a value, so the comparison has to be by
    // timestamp rather than only rejecting the format on the way in.
    it('orders a non-canonical date by what it means, not how it sorts', function() {
        assert.strictEqual(
            importer.keepDatabaseBundle({fetched: 'August 30, 2026', fingerprint: 'a'}, ours, 'b'),
            true,
            'a later non-canonical date must win'
        );
        assert.strictEqual(
            importer.keepDatabaseBundle({fetched: 'August 28, 2026', fingerprint: 'a'}, ours, 'b'),
            false,
            'an earlier non-canonical date must lose'
        );
    });

    it('still orders canonical dates correctly', function() {
        assert.strictEqual(importer.keepDatabaseBundle({fetched: '2026-08-30'}, ours, 'b'), true);
        assert.strictEqual(importer.keepDatabaseBundle({fetched: '2026-08-28'}, ours, 'b'), false);
    });

    // Same day, different bundles: the fingerprint is what makes every pod agree.
    it('falls back to the fingerprint on the same date', function() {
        assert.strictEqual(importer.keepDatabaseBundle({fetched: '2026-08-29', fingerprint: 'c'}, ours, 'b'), true);
        assert.strictEqual(importer.keepDatabaseBundle({fetched: '2026-08-29', fingerprint: 'a'}, ours, 'b'), false);
    });
});

describe('geocoder lookups', function() {
    const pluginManager = require('../../plugins/pluginManager.js');
    const Geocoder = require('../../bin/offline-geocoder/src/index.js');

    /**
     * A database whose collections are empty, recording what was opened.
     * @returns {object} fake db
     */
    function emptyDb() {
        const db = {opened: []};
        db.collection = function(name) {
            db.opened.push(name);
            return {
                find: () => ({toArray: async() => []}),
                findOne: async() => null
            };
        };
        return db;
    }

    it('uses the connection the caller shares instead of opening its own', async function() {
        const db = emptyDb();
        const original = pluginManager.dbConnection;
        let opened = 0;
        pluginManager.dbConnection = async function() {
            opened++;
            return emptyDb();
        };
        try {
            const geocoder = Geocoder({getDb: () => db});
            await geocoder.reverse(41.89, 12.49);
            assert.strictEqual(opened, 0);
            assert.ok(db.opened.includes('geocoder_coordinates'));
        }
        finally {
            pluginManager.dbConnection = original;
        }
    });

    // With a callback and no city within range, the lookup used to carry on and
    // read the nearest coordinate of an empty list.
    it('answers a reverse lookup with no city nearby through the callback, once', async function() {
        const geocoder = Geocoder({getDb: () => emptyDb()});
        const calls = [];
        const result = await geocoder.reverse(0, -150, (err, value) => calls.push([err, value]));
        assert.deepStrictEqual(calls, [[undefined, {}]]);
        assert.deepStrictEqual(result, {});
        assert.deepStrictEqual(await geocoder.reverse(0, -150), {});
    });

    it('returns nothing for a city it does not know', async function() {
        const geocoder = Geocoder({getDb: () => emptyDb()});
        assert.strictEqual(await geocoder.location('Nowhere', 'US'), undefined);
    });
});
