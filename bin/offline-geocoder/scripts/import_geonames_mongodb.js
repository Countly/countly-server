#!/usr/bin/env node

/**
 * Loads the GeoNames reverse-geocoding data into MongoDB's geocoder_* collections.
 *
 * The data comes from the gzipped bundle committed under bin/offline-geocoder/bundled/,
 * so this never touches the network — the same way city coordinates come from the
 * bundled `all-the-cities` package. Refresh the bundle with
 * bin/offline-geocoder/scripts/update_geonames_bundle.js.
 *
 * Set COUNTLY_GEONAMES_BUNDLE_DIR to read a bundle from elsewhere (a mounted
 * volume, for instance) instead of the one shipped in the tree.
 *
 * Pass --if-changed to make this a no-op when the bundle already loaded into the
 * database is the one on disk. Every successful import records the bundle's
 * fingerprint in plugins/{_id:'geonames_bundle'}, so callers that run on every
 * start (bin/docker/postinstall.sh) can reload only when the image actually brought new data.
 * That is what reaches an existing install: version-keyed migrations cannot,
 * because a rebuilt image at the SAME version carries a fresher bundle.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const pluginManager = require("../../../plugins/pluginManager.js");
const {MANIFEST, FILES, checkRowCounts, validateSemantics} = require('./bundle-spec.js');

const BUNDLE_DIR = process.env.COUNTLY_GEONAMES_BUNDLE_DIR
    || path.join(path.resolve(__dirname, '..'), 'bundled');
const COLLECTION_PREFIX = "geocoder_";
const INSERT_BATCH = 10000;
const SENTINEL_ID = 'geonames_bundle';
const LOCK_ID = 'geonames_bundle_load';
const LOCK_OWNER = require('os').hostname() + ':' + process.pid;
// Longer than a load takes on a slow disk (about a minute), short enough that a
// crashed loader does not hold back the next start for long.
const LOCK_MS = 15 * 60 * 1000;
// Suffix for the collections a load is built in before it goes live.
const STAGING_SUFFIX = '_incoming';
// Indexes loadBundle() creates, by MongoDB's auto-generated name. Keep in step
// with the createIndex calls there — a name here that is never created would
// make the health check demand a reload on every start.
const REQUIRED_INDEXES = {
    coordinates: ['latitude_1_longitude_1', 'feature_id_1'],
    features: ['id_1', 'name_1_country_id_1'],
    admin1: ['country_id_1_id_1'],
    countries: ['id_1']
};
const IF_CHANGED = process.argv.includes('--if-changed');
// Parse and validate the bundle, then exit without touching any database.
// Release validation runs this so an image whose bundle the runtime would
// refuse can never be approved by weaker checks.
const VALIDATE_ONLY = process.argv.includes('--validate-only');

// MongoDB's "ns not found". Dropping a collection that was never created is the
// expected case on a fresh database; anything else (auth, a stepping-down
// primary) must not be mistaken for it — see dropCollections().
const NS_NOT_FOUND = 26;

/**
 * Read one bundle file, checking it against the digest recorded in MANIFEST.json.
 * A mismatch means the bundle is corrupt or was edited by hand, which would load
 * silently wrong geography — so it is an error, not a warning.
 * @param {string} name - bundle file name, e.g. "cities.tsv.gz"
 * @param {object} manifest - parsed MANIFEST.json
 * @returns {string[]} the file's lines, blank lines removed
 */
function readBundleFile(name, manifest) {
    const filePath = path.join(BUNDLE_DIR, name);
    if (!fs.existsSync(filePath)) {
        throw new Error(
            `${filePath} is missing. The GeoNames bundle ships in the repository under `
            + 'bin/offline-geocoder/bundled/; regenerate it with '
            + 'node bin/offline-geocoder/scripts/update_geonames_bundle.js'
        );
    }

    const gz = fs.readFileSync(filePath);
    const expected = manifest.files && manifest.files[name] && manifest.files[name].sha256;
    // Required, not optional. A manifest without a digest used to skip verification
    // altogether, so a hand-edited file loaded as long as its row count cleared the
    // floor — and fingerprint() folded the same gap into `missing`, so a later edit
    // to that file still looked "already loaded" under --if-changed.
    if (typeof expected !== 'string' || !/^[0-9a-f]{64}$/.test(expected)) {
        throw new Error(
            `MANIFEST.json records no valid sha256 for ${name}, so its contents cannot be verified. `
            + 'Regenerate the bundle with node bin/offline-geocoder/scripts/update_geonames_bundle.js'
        );
    }
    const actual = crypto.createHash('sha256').update(gz).digest('hex');
    if (actual !== expected) {
        throw new Error(
            `${name} does not match the digest in MANIFEST.json (expected ${expected}, got ${actual}). `
            + 'Regenerate the bundle with node bin/offline-geocoder/scripts/update_geonames_bundle.js'
        );
    }

    return zlib.gunzipSync(gz).toString('utf8').split('\n').filter(line => line.trim());
}

/**
 * Fingerprint a bundle from the per-file digests its manifest records.
 *
 * Derived from the digests rather than the manifest bytes so that reformatting
 * the JSON, or a differing `fetched` date on byte-identical data, does not read
 * as a change worth a 170k-row reimport.
 * @param {object} manifest - parsed MANIFEST.json
 * @returns {string} stable fingerprint of the bundle's contents
 */
function fingerprint(manifest) {
    const parts = Object.keys(FILES).sort().map(name => {
        const sha = ((manifest.files || {})[name] || {}).sha256;
        // No placeholder for a missing digest: two different checksum-less bundles
        // would fingerprint identically and the second would look already-loaded.
        if (typeof sha !== 'string' || !/^[0-9a-f]{64}$/.test(sha)) {
            throw new Error(
                `MANIFEST.json records no valid sha256 for ${name}, so this bundle cannot be identified. `
                + 'Regenerate it with node bin/offline-geocoder/scripts/update_geonames_bundle.js'
            );
        }
        return `${name}:${sha}`;
    });
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Strip the characters the geocoder's own name matching cannot carry.
 * @param {string} value - raw name from the bundle
 * @returns {string} cleaned name
 */
function cleanName(value) {
    return value.replace(/"/g, '').replace(/;/g, '');
}

/**
 * Which live collections are absent or implausibly short for this manifest?
 *
 * The floors come from the manifest's own row counts rather than the shared
 * spec, so a legitimately smaller custom bundle is judged against itself. A
 * generous fraction is used because the check is for "gone or gutted", not for
 * exact equality — the digests already cover content.
 * @param {object} db - open database connection
 * @param {object} manifest - parsed MANIFEST.json
 * @returns {Promise<string[]>} names of collections needing a reload
 */
/**
 * Row counts a bundle manifest says each collection should hold.
 * @param {object} manifest - parsed MANIFEST.json
 * @returns {object} {collection: rows}
 */
function expectedRows(manifest) {
    return {
        features: (manifest.files['cities.tsv.gz'] || {}).rows,
        coordinates: (manifest.files['cities.tsv.gz'] || {}).rows,
        admin1: (manifest.files['admin1.tsv.gz'] || {}).rows,
        countries: (manifest.files['countries.tsv.gz'] || {}).rows
    };
}

/**
 * Which geocoder collections are missing, short, or lacking a required index?
 *
 * For THIS bundle's generation (`exact`), every collection must hold exactly
 * the rows the manifest recorded from the bundle files — real counts of real
 * data, so a selective restore that lost part of a collection is caught. For a
 * different generation we chose to keep, only non-empty can be asked: its
 * counts are not ours to know. Rows present is not the same as usable —
 * reverse geocoding range-scans coordinates and then joins, so a dropped index
 * turns every lookup into a collection scan, silently; loading the bundle is
 * what recreates them, so the check that gates it has to look.
 * @param {object} db - mongodb Db
 * @param {object} manifest - this image's manifest (names and counts)
 * @param {boolean} [exact] - require the manifest's row counts (own generation)
 * @returns {Promise<string[]>} human-readable list of what is missing
 */
async function missingCollections(db, manifest, exact) {
    const bad = [];
    const expected = expectedRows(manifest);
    for (const name of Object.keys(expected)) {
        const collection = db.collection(COLLECTION_PREFIX + name);
        const count = await collection.countDocuments({});
        const short = exact && typeof expected[name] === 'number' ? count !== expected[name] : count < 1;
        if (short) {
            bad.push(exact ? `${COLLECTION_PREFIX}${name} (${count} rows, expected ${expected[name]})` : COLLECTION_PREFIX + name);
            continue;
        }
        // NamespaceNotFound is the one honest "missing" answer; any other
        // listIndexes error fails the run so the next start retries without
        // rewriting known-present data.
        const present = new Set((await collection.indexes().catch((err) => {
            if (err && (err.code === 26 || /ns does not exist|ns not found/i.test(String(err.message)))) {
                return [];
            }
            throw err;
        })).map(i => i.name));
        const absent = (REQUIRED_INDEXES[name] || []).filter(index => !present.has(index));
        if (absent.length) {
            bad.push(`${COLLECTION_PREFIX}${name} (missing index ${absent.join(', ')})`);
        }
    }
    return bad;
}

/**
 * Should the bundle already in the database be kept in preference to this one?
 *
 * Newer wins on the fetch date. Equal dates are the case the date alone cannot
 * settle: two images built the same day from different upstream snapshots would
 * each see the other as "different — reloading" and overwrite it on every
 * restart. Breaking the tie on the fingerprint gives every pod the same answer
 * regardless of start order, so the set converges on one bundle instead of
 * flapping between them. Which fingerprint wins does not matter; that they all
 * agree does.
 * @param {object} loaded - the sentinel document already in the database
 * @param {object} manifest - this image's parsed MANIFEST.json
 * @param {string} want - this image's bundle fingerprint
 * @returns {boolean} true to keep what is loaded and skip this bundle
 */
function keepDatabaseBundle(loaded, manifest, want) {
    // Parsed timestamps, not string order. These are ISO dates by construction —
    // the updater writes toISOString().slice(0, 10) — but a custom bundle supplied
    // through COUNTLY_GEONAMES_BUNDLE_DIR could carry any parseable form, and
    // "August 28, 2026" sorts before "2026-08-29" as a string while being later as
    // a date. Sentinels already in databases may hold such a value, so comparing
    // timestamps is what makes this right for them too, not only for new loads.
    const loadedAt = Date.parse(loaded.fetched);
    const ourAt = Date.parse(manifest.fetched);
    if (Number.isFinite(loadedAt) && Number.isFinite(ourAt)) {
        if (loadedAt > ourAt) {
            return true;
        }
        if (loadedAt < ourAt) {
            return false;
        }
    }
    return !!loaded.fingerprint && loaded.fingerprint > want;
}

/**
 * Rename each staged collection over its live counterpart.
 *
 * renameCollection with dropTarget is atomic per collection, so a reader sees
 * either the old set or the new one, never a partially rebuilt collection. The
 * four renames are NOT atomic as a group, so a crash between them leaves a mix
 * of old and new rows.
 *
 * An earlier version of this comment claimed each row is self-contained and a
 * mixed set therefore still answers correctly. That is wrong, and worth stating
 * plainly rather than quietly deleting: src/reverse.js and src/location.js query
 * coordinates, features, admin1 and countries SEPARATELY within one lookup, so
 * between two renames a caller can read a feature that has no coordinates yet, or
 * select a coordinate whose feature has just been removed. For the duration of
 * the swap — four renames, milliseconds — reverse geocoding can return a wrong or
 * empty answer for places that changed between bundles.
 *
 * Not closed here. Doing so means publishing a generation pointer and teaching
 * every reader to follow it, which is a change to the geocoder's read path rather
 * than to its loader. What IS closed is the durable half: a crash mid-swap no
 * longer leaves a permanently mixed set, because of the marker below.
 *
 * Rather than version the collections and teach every reader to follow a
 * generation pointer, the swap is made recoverable: a marker is set before the
 * first rename and cleared only once the sentinel lands. While it is set, this
 * script's --if-changed check reports the load as outstanding, so the next run
 * — the next container start, the next upgrade, or this script run by hand — rebuilds and re-swaps the whole set.
 * @param {object} db - open database connection
 * @returns {Promise<void>} resolves once every collection is live
 */
async function swapIntoPlace(db) {
    await db.collection('plugins').updateOne(
        {_id: SENTINEL_ID},
        {$set: {swapInProgress: true}},
        {upsert: true}
    );
    for (const name of ['features', 'coordinates', 'admin1', 'countries']) {
        const from = COLLECTION_PREFIX + name + STAGING_SUFFIX;
        const to = COLLECTION_PREFIX + name;
        try {
            await db.renameCollection(from, to, {dropTarget: true});
        }
        catch (err) {
            throw new Error(
                `Could not swap ${from} into ${to}: ${err.message}. `
                + 'The live set may hold a mix of two bundles until the next run '
                + 'rebuilds it — the swap-in-progress marker is still set, so that '
                + 'rebuild is guaranteed.'
            );
        }
    }
}

/**
 * Insert documents in bounded batches so peak memory stays flat on a 170k-row load.
 * @param {object} collection - MongoDB collection
 * @param {object[]} docs - documents to insert
 * @returns {Promise<void>} resolves once every batch is written
 */
async function insertInBatches(collection, docs) {
    for (let i = 0; i < docs.length; i += INSERT_BATCH) {
        await collection.insertMany(docs.slice(i, i + INSERT_BATCH), {ordered: false});
    }
}

/**
 * Parse the bundle and (re)build the geocoder_* collections.
 * @returns {Promise<void>} resolves once the collections and indexes exist
 */
async function importBundle() {
    console.log(`Loading GeoNames bundle from ${BUNDLE_DIR}`);

    const manifestPath = path.join(BUNDLE_DIR, MANIFEST);
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`${manifestPath} is missing — ${BUNDLE_DIR} is not a GeoNames bundle directory.`);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assertUsableFetchDate(manifest.fetched);
    console.log(`Bundle fetched ${manifest.fetched} from ${manifest.source}`);

    // The fingerprint comes from the manifest, so --if-changed can answer before any
    // file is read. It has to: parsing the bundle materializes ~340k objects and
    // around 180 MB RSS, which a memory-capped init container should not pay on
    // every restart just to discover there is nothing to do.
    if (VALIDATE_ONLY) {
        const parsed = parseBundle(manifest);
        console.log(`Bundle validated: ${parsed.featuresArray.length} cities, `
            + `${parsed.admin1Array.length} admin1, ${parsed.countriesArray.length} countries. `
            + 'No database touched.');
        process.exit(0);
    }

    const want = fingerprint(manifest);
    const db = await pluginManager.dbConnection();

    try {
        if (IF_CHANGED) {
            // One rule. Load when: nothing is recorded, a previous swap did not
            // finish, the loaded generation is this one but damaged, or a
            // DIFFERENT generation is loaded and this bundle is newer. Keep the
            // loaded data when it is a different, newer (or same-day) generation
            // that is intact — two images of one release built on different
            // days must converge on the newest data instead of taking turns.
            const loaded = await db.collection('plugins').findOne({_id: SENTINEL_ID});
            if (!loaded) {
                console.log('No GeoNames bundle recorded in the database — loading.');
            }
            else if (loaded.swapInProgress) {
                console.log('A previous GeoNames swap did not finish — reloading.');
            }
            else if (loaded.fingerprint === want) {
                // Our own generation: the manifest's counts are the real counts
                // of the loaded data, so hold it to them exactly.
                const missing = await missingCollections(db, manifest, true);
                {
                    if (!missing.length) {
                        console.log(`GeoNames data already current (fetched ${loaded.fetched}, loaded ${loaded.loadedAt}) — nothing to do.`);
                        return;
                    }
                    console.log(`GeoNames marker is current but ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing or short — reloading.`);
                }
            }
            else {
                // A different generation: its counts are not ours to know, so
                // only non-empty and indexed can be asked of it.
                const missing = await missingCollections(db, manifest);
                if (loaded.fetched && manifest.fetched && keepDatabaseBundle(loaded, manifest, want)) {
                    if (!missing.length) {
                        console.log(`Database holds a newer GeoNames bundle (fetched ${loaded.fetched}) than this image `
                            + `(fetched ${manifest.fetched}) — keeping the loaded data.`);
                        return;
                    }
                    console.log(`Database records a newer GeoNames bundle (fetched ${loaded.fetched}) but `
                        + `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing — loading this image's bundle.`);
                }
                else {
                    console.log(`Database holds an older GeoNames bundle (fetched ${loaded.fetched}) — reloading.`);
                }
            }
        }

        if (!await takeLoadLease(db)) {
            console.log('Another process is loading the GeoNames bundle — leaving it to finish.');
            return;
        }
        try {
            await loadBundle(db, manifest, want);
        }
        finally {
            await db.collection('plugins').deleteOne({_id: LOCK_ID, owner: LOCK_OWNER});
        }
    }
    finally {
        db.close();
    }
}

/**
 * Take the lease that lets one process load at a time. Every API container runs
 * this script at start, and two loads at once would rebuild the same staging
 * collections under each other. A lease left by a crashed process expires.
 * @param {object} db - open database connection
 * @returns {Promise<boolean>} true when this process holds the lease
 */
async function takeLoadLease(db) {
    const now = new Date();
    try {
        await db.collection('plugins').findOneAndUpdate(
            {_id: LOCK_ID, until: {$lt: now}},
            {$set: {owner: LOCK_OWNER, until: new Date(now.getTime() + LOCK_MS)}},
            {upsert: true}
        );
        return true;
    }
    catch (err) {
        // A live lease exists: the upsert tried to insert a second LOCK_ID.
        if (err && err.code === 11000) {
            return false;
        }
        throw err;
    }
}

/**
 * Parse and validate every bundle file, without touching the database.
 *
 * Everything that can be known about a bundle before staging happens here —
 * per-file digests (inside readBundleFile), row shapes, coordinate and join-key
 * validity, duplicate keys, cross-file consistency, and row counts against the
 * manifest — so --validate-only (used by release validation) exercises the
 * exact checks first boot runs, and a bundle it approves cannot be one the
 * runtime refuses.
 * @param {object} manifest - parsed MANIFEST.json
 * @returns {object} parsed arrays: featuresArray, coordinatesArray, admin1Array, countriesArray
 */
function parseBundle(manifest) {
    // One shared definition of what a semantically valid bundle is — the same
    // checks the updater runs before it may replace the committed bundle, so
    // the writer and the reader can never disagree (see bundle-spec.js).
    const lines = {
        'cities.tsv.gz': readBundleFile('cities.tsv.gz', manifest),
        'admin1.tsv.gz': readBundleFile('admin1.tsv.gz', manifest),
        'countries.tsv.gz': readBundleFile('countries.tsv.gz', manifest)
    };
    validateSemantics(lines);

    // cities.tsv.gz: geonameid, name, latitude, longitude, country_code, admin1_code, timezone
    const featuresArray = [];
    const coordinatesArray = [];
    for (const line of lines['cities.tsv.gz']) {
        const fields = line.split('\t');
        if (fields.length < 7) {
            continue;
        }
        const id = parseInt(fields[0]);
        featuresArray.push({
            id: id,
            name: cleanName(fields[1]),
            country_id: fields[4],
            // The admin1 code stays a string. Half the world's codes are not numeric
            // ("ENG", "WLS", "SCT", ...), so parseInt turned them into NaN on BOTH
            // sides of the join -- and Mongo matches NaN to NaN, so every GB city
            // joined to whichever NaN admin1 row came first and reported "Wales".
            admin1_id: fields[5],
            tz: fields[6]
        });
        const latitude = parseFloat(fields[2]);
        const longitude = parseFloat(fields[3]);
        coordinatesArray.push({
            feature_id: id,
            latitude: latitude,
            longitude: longitude
        });
    }

    // admin1.tsv.gz: "<country_code>.<admin1_code>", name
    const admin1Array = [];
    for (const line of lines['admin1.tsv.gz']) {
        const fields = line.split('\t');
        if (fields.length < 2) {
            continue;
        }
        const idParts = fields[0].split('.');
        admin1Array.push({
            country_id: idParts[0],
            // String, to match features.admin1_id above. Numeric codes are
            // zero-padded upstream ("03", "07") and both files use the same
            // padding, so they still join exactly.
            id: idParts[1],
            name: cleanName(fields[1])
        });
    }

    // countries.tsv.gz: country_code, name
    const countriesArray = [];
    for (const line of lines['countries.tsv.gz']) {
        const fields = line.split('\t');
        if (fields.length < 2) {
            continue;
        }
        countriesArray.push({id: fields[0], name: fields[1]});
    }

    // Validate BEFORE opening the database. The import is a drop-and-replace, so a
    // bundle that parses to a handful of rows would silently wipe geography for
    // almost every location — and the digest check above cannot catch that, since a
    // hand-built stub bundle is internally consistent with its own manifest.
    const counts = {
        'cities.tsv.gz': featuresArray.length,
        'admin1.tsv.gz': admin1Array.length,
        'countries.tsv.gz': countriesArray.length
    };

    // What we parsed must be what the manifest promised. A mismatch means the
    // parser and the writer disagree about the format, which no digest can reveal.
    for (const [name, parsed] of Object.entries(counts)) {
        const declared = manifest.files && manifest.files[name] && manifest.files[name].rows;
        // Required, not optional. A manifest that declares no count skipped this
        // check entirely, and the sentinel then recorded undefined expectations —
        // which missingCollections() reduces to a one-row floor, so a selective
        // restore leaving a handful of rows was reported healthy forever and the
        // startup repair never reloaded anything.
        if (typeof declared !== 'number') {
            throw new Error(
                `MANIFEST.json declares no row count for ${name}. That count is what later starts `
                + 'check the collections against, so a bundle without it cannot be verified — '
                + 'refusing to load it.'
            );
        }
        if (declared !== parsed) {
            throw new Error(
                `${name} parsed to ${parsed} rows but MANIFEST.json declares ${declared} — `
                + 'refusing to replace the geocoder collections with it.'
            );
        }
    }

    const short = checkRowCounts(counts);
    if (short) {
        throw new Error(
            `Refusing to replace the geocoder collections from ${BUNDLE_DIR}: ${short}. `
            + 'Regenerate the bundle with node bin/offline-geocoder/scripts/update_geonames_bundle.js'
        );
    }

    return {featuresArray, coordinatesArray, admin1Array, countriesArray};
}

/**
 * Parse the bundle and (re)build the geocoder_* collections.
 * @param {object} db - open database connection
 * @param {object} manifest - parsed MANIFEST.json
 * @param {string} want - fingerprint to record once the load succeeds
 * @returns {Promise<void>} resolves once the collections and indexes exist
 */
async function loadBundle(db, manifest, want) {
    const {featuresArray, coordinatesArray, admin1Array, countriesArray} = parseBundle(manifest);

    {
        // Build alongside, then swap. The live collections are never emptied.
        //
        // This matters because the processes already serving do NOT participate in
        // the load lease: during a rolling deployment with a changed bundle, old API
        // containers keep querying these collections throughout the rebuild.
        // Emptying them first left a multi-second window where reverse geocoding
        // returned nothing, so events ingested in that window were permanently
        // recorded without a city. A rename is effectively instantaneous, so the
        // window closes.
        //
        // (Dropping the live collections was worse still: a drop finalizes
        // asynchronously on a replica set, so recreating the namespace and indexing
        // it could collide with the pending drop — "Collection ... is being
        // dropped" — which the upgrade-path test caught.)
        const staging = {};
        for (const name of ['features', 'coordinates', 'admin1', 'countries']) {
            const tmp = db.collection(COLLECTION_PREFIX + name + STAGING_SUFFIX);
            // A staging collection left behind by an interrupted run must not be
            // appended to; this is the one place a drop is safe, since nothing reads it.
            try {
                await tmp.drop();
            }
            catch (err) {
                if (!err || (err.code !== NS_NOT_FOUND && err.codeName !== 'NamespaceNotFound')) {
                    throw new Error(`Could not clear staging collection ${tmp.collectionName}: ${err.message}`);
                }
            }
            staging[name] = tmp;
        }

        const features = staging.features;
        const coordinates = staging.coordinates;
        const admin1 = staging.admin1;
        const countries = staging.countries;

        console.log(`Inserting ${featuresArray.length} features...`);
        await insertInBatches(features, featuresArray);

        console.log(`Inserting ${coordinatesArray.length} coordinates...`);
        await insertInBatches(coordinates, coordinatesArray);

        console.log(`Inserting ${admin1Array.length} admin1 records...`);
        await insertInBatches(admin1, admin1Array);

        console.log(`Inserting ${countriesArray.length} countries...`);
        await insertInBatches(countries, countriesArray);

        // Indexed BEFORE the swap, so the collections are fully queryable the
        // instant they become live.
        console.log("Creating indexes...");
        await coordinates.createIndex({ latitude: 1, longitude: 1 });
        await coordinates.createIndex({ feature_id: 1 });
        await features.createIndex({ id: 1 });
        await features.createIndex({ name: 1, country_id: 1 });
        await admin1.createIndex({ country_id: 1, id: 1 });
        await countries.createIndex({ id: 1 });

        console.log("Swapping the refreshed collections into place...");
        await swapIntoPlace(db);

        // Record what was loaded only after the collections and indexes are in
        // place, so an interrupted import is retried rather than reported as
        // current.
        await db.collection('plugins').updateOne(
            {_id: SENTINEL_ID},
            {
                $set: {fingerprint: want, fetched: manifest.fetched, loadedAt: new Date().toISOString()},
                $unset: {swapInProgress: '', rows: ''}
            },
            {upsert: true}
        );

        console.log(`Created MongoDB collections with ${featuresArray.length} features.`);
    }
}

/**
 * Refuse a manifest whose fetch date cannot be trusted.
 *
 * The date is not decoration: it is persisted in the sentinel and then decides
 * keepDatabaseBundle(), so a bad one outlives this run. A malformed value makes
 * every comparison against it false, and a FUTURE one makes this bundle beat
 * every correctly dated bundle that follows — blocking GeoNames refreshes until
 * that date arrives. COUNTLY_GEONAMES_BUNDLE_DIR lets an operator point at a
 * custom bundle, so this is reachable at runtime and not only at build time,
 * which is why the check belongs here as well as in the release smoke test.
 * @param {string} fetched - the manifest's fetched value
 * @returns {void}
 * @throws {Error} when the date is unusable
 */
function assertUsableFetchDate(fetched) {
    // The canonical form the updater writes. Requiring it keeps every bundle this
    // importer loads directly comparable, so the ordering above never has to fall
    // back on a fingerprint tie-break because two dates were written differently.
    if (typeof fetched !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fetched)) {
        throw new Error(
            `Refusing this GeoNames bundle: its manifest's "fetched" value ${JSON.stringify(fetched)} `
            + 'is not an ISO date (YYYY-MM-DD). That value is recorded in the database and orders '
            + 'bundles against each other, so it has to be written the one way.'
        );
    }
    const at = Date.parse(fetched);
    // Round-trip, because shape and parseability are not calendar validity:
    // Date.parse("2026-02-30") does NOT return NaN — V8 normalises it to March 2
    // — so an impossible date would be persisted as written and then ORDERED as
    // the normalised one, silently winning or losing refreshes it should not.
    if (Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) !== fetched) {
        throw new Error(
            `Refusing this GeoNames bundle: its manifest date ${fetched} is not a real calendar `
            + 'date (it normalises to ' + new Date(at).toISOString().slice(0, 10) + ').'
        );
    }
    if (!Number.isFinite(at)) {
        throw new Error(
            `Refusing this GeoNames bundle: its manifest has no usable "fetched" date `
            + `(${JSON.stringify(fetched)}). That value is recorded in the database and decides `
            + 'which bundle wins on a later start, so it cannot be left unchecked.'
        );
    }
    // A day of slack, so a bundle built moments ago in a slightly ahead timezone
    // is not rejected for being "in the future".
    if (at - Date.now() > 86400000) {
        throw new Error(
            `Refusing this GeoNames bundle: its manifest is dated in the future (${fetched}). `
            + 'Loading it would make every correctly dated bundle that follows look older, '
            + 'blocking GeoNames refreshes until that date arrives.'
        );
    }
}

/**
 * Fingerprint the bundle on disk without touching the database.
 *
 * Exported so a caller can decide whether a load is needed BEFORE taking a lock.
 * With every application process running the startup gate, the steady-state path
 * has to be lock-free or a rollout serialises every pod behind one lock holder.
 * @param {string} [dir] - bundle directory (defaults to the resolved BUNDLE_DIR)
 * @returns {string} fingerprint of the bundle's contents
 */
function bundleFingerprint(dir = BUNDLE_DIR) {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8'));
    return fingerprint(manifest);
}

/**
 * Parse the bundle manifest without touching the database.
 * @param {string} [dir] - bundle directory (defaults to the resolved BUNDLE_DIR)
 * @returns {object} parsed MANIFEST.json
 */
function bundleManifest(dir = BUNDLE_DIR) {
    return JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8'));
}

module.exports = {
    expectedRows,
    bundleFingerprint,
    bundleManifest,
    missingCollections,
    keepDatabaseBundle,
    REQUIRED_INDEXES,
    SENTINEL_ID,
    BUNDLE_DIR
};

// Only run as a CLI. Required as a module (by the unit tests) it must stay side-effect free.
if (require.main === module) {
    importBundle()
        .then(() => {
            console.log("Done importing GeoNames data into MongoDB!");
        })
        .catch(err => {
            // No "Error:" prefix: an Error's own output already starts with it, and the
            // validation failures above are the common case here — they should read as
            // one clear sentence, not a doubled prefix.
            console.error(err.message || err);
            process.exit(1);
        });
}
