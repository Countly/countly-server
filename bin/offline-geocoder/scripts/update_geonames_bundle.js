#!/usr/bin/env node

/**
 * Fetches GeoNames data from upstream and writes a projected, gzipped bundle.
 *
 * This is the ONLY script in the tree that downloads GeoNames data. Nothing at
 * container start or request time calls it — imports read whatever bundle is on
 * disk, so a running Countly never needs outbound network access.
 *
 * Run by hand only (`npm run geonames:update`); installs and images use the copy
 * committed under bin/offline-geocoder/bundled/.
 *
 * Run it from a dev checkout to refresh the committed floor, then commit what
 * changed under bundled/:
 *
 *     npm run geonames:update
 *
 * Options:
 *   --out <dir>        Write the bundle here instead of bin/offline-geocoder/bundled/.
 *                      Also settable as GEONAMES_OUT_DIR. The build stage uses
 *                      this to stage a fresh bundle without touching the tree.
 *
 * Environment:
 *   GEONAMES_BASE_URL  Override the download host, e.g. an internal mirror.
 *                      Default: https://download.geonames.org/export/dump
 *
 * The upstream files carry ~19 columns; the importer stores 7 of them. We
 * project down to what is stored before compressing, which takes the cities
 * blob from ~10.6 MB to ~3.0 MB. Widening the projection means editing
 * CITY_COLUMNS below and re-running this script.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const yauzl = require('yauzl');
const { MANIFEST, FILES, checkRowCounts, validateSemantics } = require('./bundle-spec.js');

/**
 * Resolve the output directory: --out wins, then GEONAMES_OUT_DIR, then the
 * committed bundle in the tree.
 * @returns {string} directory to write the bundle into
 */
function resolveOutDir() {
    const flag = process.argv.indexOf('--out');
    if (flag !== -1) {
        const value = process.argv[flag + 1];
        if (!value || value.startsWith('--')) {
            throw new Error('--out requires a directory argument');
        }
        return path.resolve(value);
    }
    if (process.env.GEONAMES_OUT_DIR) {
        return path.resolve(process.env.GEONAMES_OUT_DIR);
    }
    return path.join(path.resolve(__dirname, '..'), 'bundled');
}

const BUNDLE_DIR = resolveOutDir();
const DEFAULT_BASE_URL = 'https://download.geonames.org/export/dump';
const BASE_URL = (process.env.GEONAMES_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

// Upstream column indexes (0-based), per https://download.geonames.org/export/dump/readme.txt
const CITY_COLUMNS = [
    0, // geonameid
    1, // name
    4, // latitude
    5, // longitude
    8, // country code
    10, // admin1 code
    17 // timezone
];
const CITY_MIN_COLUMNS = 19;

const ADMIN1_COLUMNS = [0, 1]; // "<country>.<admin1 code>", name
const ADMIN1_MIN_COLUMNS = 3;

const COUNTRY_COLUMNS = [0, 4]; // ISO, country name
const COUNTRY_MIN_COLUMNS = 5;

// A stalled download must reject, not hang. Both callers treat a failure as
// "fall back to the committed bundle", and a host that accepts the connection but
// never finishes the response would otherwise hold the image build or the OS
// build open until some outer job timeout kills it — never reaching the
// fallback the whole design promises. IDLE_TIMEOUT_MS is per chunk, so a slow but
// progressing transfer is not punished; TOTAL_TIMEOUT_MS bounds the whole request.
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
/**
 * Strip credentials from a URL before it is logged or written to disk.
 *
 * GEONAMES_BASE_URL is documented as an internal-mirror override, and a mirror
 * may well be authenticated as https://user:token@mirror.example. The raw value
 * used to reach two places that outlive the build: MANIFEST.json, which Docker
 * copies into the runtime image and a source checkout keeps in the installed
 * bundle, and the build/install logs. Either one hands the mirror credentials to
 * anyone who can read the image or the log.
 *
 * Query values go too, since a token is as likely to arrive as ?apikey= as it is
 * in the userinfo. Parameter names are kept, because they are useful when a
 * mirror URL is wrong and they are not the secret.
 * @param {string} url - URL that may carry credentials
 * @returns {string} the same URL with anything secret replaced
 */
function redactUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch (e) {
        // Not parseable, so nothing can be selectively removed. Say so rather
        // than echoing a string that might carry a token.
        return '<unparseable url>';
    }
    // The known public upstream carries no secret by construction — keep it
    // verbatim so bundle rebuilds do not rewrite MANIFEST.json's source and
    // default-download logging stays readable. EXACT URLs only: a prefix test
    // trusted every descendant, so a credential embedded as a subpath
    // (…/dump/token/SECRET) — like one in userinfo, a query, or a fragment —
    // rode the trusted prefix into the logs and the image. The allowlist is
    // the base URL plus the three files this script downloads from it.
    const knownUpstream = [
        DEFAULT_BASE_URL,
        DEFAULT_BASE_URL + '/',
        DEFAULT_BASE_URL + '/cities1000.zip',
        DEFAULT_BASE_URL + '/admin1CodesASCII.txt',
        DEFAULT_BASE_URL + '/countryInfo.txt'
    ];
    if (!parsed.username && !parsed.password && !parsed.search && !parsed.hash
        && knownUpstream.includes(parsed.href)) {
        return parsed.href;
    }
    // A custom mirror can embed its credential ANYWHERE: userinfo, a query
    // value, but also a path segment (https://mirror.example/TOKEN/dump) or the
    // fragment — and unlike query parameters, path segments have no name/value
    // structure that would let secrets be removed selectively. Record only the
    // origin: enough to identify the mirror, never enough to authenticate.
    return parsed.origin;
}

/**
 * Build the URL for one upstream file under GEONAMES_BASE_URL.
 *
 * String concatenation breaks the very case redactUrl() exists for: a mirror
 * authenticated as https://mirror.example/export?apikey=token concatenated with
 * "/cities1000.zip" yields ...?apikey=token/cities1000.zip — the pathname never
 * changes and the filename is swallowed into the token, so all three downloads
 * fail against a perfectly good mirror. Append to the parsed pathname and leave
 * the search parameters where they belong.
 * @param {string} file - upstream file name
 * @returns {string} absolute URL to fetch
 */
function bundleUrl(file) {
    let parsed;
    try {
        parsed = new URL(BASE_URL);
    }
    catch (e) {
        // Not parseable; let download() fail with its own message rather than
        // guessing at a repair here.
        return BASE_URL + '/' + file;
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/' + file;
    return parsed.href;
}

const IDLE_TIMEOUT_MS = 30000;
const TOTAL_TIMEOUT_MS = 300000;

/**
 * Download a URL into memory, bounded by an idle and a total timeout.
 * @param {string} url - URL to fetch
 * @param {number} [redirectsLeft] - remaining redirect hops
 * @returns {Promise<Buffer>} response body
 */
function download(url, redirectsLeft = 5) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading ${redactUrl(url)}`);
        let settled = false;
        // Declared ahead of fail(), which tears both down; assigned below.
        let req;
        let totalTimer;

        /**
         * Reject once, tearing the request down so the process can exit.
         * @param {Error} err - why the download failed
         * @returns {void}
         */
        const fail = err => {
            if (settled) {
                return;
            }
            settled = true;
            if (req) {
                req.destroy();
            }
            clearTimeout(totalTimer);
            reject(err);
        };

        totalTimer = setTimeout(
            () => fail(new Error(`Timed out after ${TOTAL_TIMEOUT_MS}ms downloading ${redactUrl(url)}`)),
            TOTAL_TIMEOUT_MS
        );

        // Pick the client from the URL. An internal mirror on plain HTTP is a
        // documented use of GEONAMES_BASE_URL, and https.get throws
        // ERR_INVALID_PROTOCOL on an http:// URL before making any request.
        const client = new URL(url).protocol === 'http:' ? http : https;
        req = client.get(url, response => {
            // 303/307/308 are as standard as 301/302, and a mirror behind
            // GEONAMES_BASE_URL is free to use any of them. Treating them as
            // failures made a build keep an older bundle for no reason,
            // and failed a release build (GEONAMES_REQUIRED=true) over data that
            // was actually reachable one hop away.
            if (REDIRECT_STATUSES.has(response.statusCode)) {
                response.resume();
                if (redirectsLeft <= 0) {
                    fail(new Error(`Too many redirects downloading ${redactUrl(url)}`));
                    return;
                }
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(totalTimer);
                resolve(download(new URL(response.headers.location, url).href, redirectsLeft - 1));
                return;
            }
            if (response.statusCode !== 200) {
                response.resume();
                fail(new Error(`Failed to download ${redactUrl(url)}: HTTP ${response.statusCode}`));
                return;
            }
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(totalTimer);
                resolve(Buffer.concat(chunks));
            });
            response.on('error', fail);
        });

        // Fires on connect stall and on any gap between chunks.
        req.setTimeout(IDLE_TIMEOUT_MS, () => fail(
            new Error(`No data for ${IDLE_TIMEOUT_MS}ms downloading ${redactUrl(url)}`)
        ));
        req.on('error', fail);
    });
}

/**
 * Extract a single named entry from a zip archive held in memory.
 * @param {Buffer} zipBuffer - the archive
 * @param {string} entryName - file name inside the archive
 * @returns {Promise<Buffer>} entry contents
 */
function extractFromZip(zipBuffer, entryName) {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(zipBuffer, {lazyEntries: true}, (err, zipfile) => {
            if (err) {
                reject(err);
                return;
            }
            let found = false;
            zipfile.on('entry', entry => {
                if (entry.fileName !== entryName) {
                    zipfile.readEntry();
                    return;
                }
                found = true;
                zipfile.openReadStream(entry, (streamErr, readStream) => {
                    if (streamErr) {
                        reject(streamErr);
                        return;
                    }
                    const chunks = [];
                    readStream.on('data', chunk => chunks.push(chunk));
                    readStream.on('end', () => resolve(Buffer.concat(chunks)));
                    readStream.on('error', reject);
                });
            });
            zipfile.on('end', () => {
                if (!found) {
                    reject(new Error(`${entryName} not found in archive`));
                }
            });
            zipfile.on('error', reject);
            zipfile.readEntry();
        });
    });
}

/**
 * Project an upstream TSV down to the columns the importer stores.
 * Comment lines (countryInfo.txt) and short rows are dropped, matching what the
 * importer skipped when it read the upstream files directly.
 * @param {Buffer} buffer - upstream file contents
 * @param {number[]} columns - upstream column indexes to keep, in output order
 * @param {number} minColumns - rows with fewer columns than this are dropped
 * @returns {{text: string, rows: number}} projected TSV and its row count
 */
function project(buffer, columns, minColumns) {
    const out = [];
    for (const line of buffer.toString('utf8').split('\n')) {
        if (!line.trim() || line.startsWith('#')) {
            continue;
        }
        const fields = line.split('\t');
        if (fields.length < minColumns) {
            continue;
        }
        out.push(columns.map(i => (fields[i] || '').trim()).join('\t'));
    }
    return {text: out.join('\n') + '\n', rows: out.length};
}

/**
 * Compress text and write it into a directory.
 * @param {string} dir - directory to write into
 * @param {string} name - bundle file name, including the .gz suffix
 * @param {string} text - projected TSV
 * @returns {{bytes: number, sha256: string}} written size and digest of the .gz
 */
function writeBundleFile(dir, name, text) {
    const gz = zlib.gzipSync(Buffer.from(text, 'utf8'), {level: zlib.constants.Z_BEST_COMPRESSION});
    fs.writeFileSync(path.join(dir, name), gz);
    return {bytes: gz.length, sha256: crypto.createHash('sha256').update(gz).digest('hex')};
}

// Written into the backup directory once every file of the new bundle is in
// place. Its presence is what distinguishes "the swap finished, this backup is
// just litter" from "the swap was interrupted, put the old files back".
const SWAP_DONE = '.swap-complete';

/**
 * Undo or discard a backup left behind by an interrupted swap.
 *
 * The in-process rollback covers an exception. It does not cover SIGKILL, an OOM
 * kill or the host losing power between two renames — and those leave exactly the
 * state the whole backup exists to prevent: some new files live, MANIFEST.json
 * still the old one, and the importer refusing the mixed set on its digests. So
 * recovery also runs at the start of the next invocation, before anything else
 * touches the directory.
 *
 * Restoring is the safe direction. The backup only ever holds the previously
 * committed files, so putting them back yields the bundle the image build
 * document as their fallback; at worst a completed-but-unmarked swap is undone
 * and the next run fetches again.
 * @param {string} [dir] - bundle directory (defaults to the resolved BUNDLE_DIR)
 * @returns {void}
 */
function recoverInterruptedSwap(dir = BUNDLE_DIR) {
    let entries;
    try {
        entries = fs.readdirSync(dir);
    }
    catch (e) {
        return;
    }
    for (const entry of entries.filter(n => n.startsWith('.backup-'))) {
        const backup = path.join(dir, entry);
        const finished = fs.existsSync(path.join(backup, SWAP_DONE));
        if (!finished) {
            console.log(`Recovering the committed bundle from an interrupted swap (${entry}).`);
            for (const name of fs.readdirSync(backup)) {
                fs.renameSync(path.join(backup, name), path.join(dir, name));
            }
        }
        fs.rmSync(backup, {recursive: true, force: true});
    }
}

/**
 * Move a completed staging directory into BUNDLE_DIR, all files or none.
 * @param {string} staging - directory holding the finished bundle
 * @param {string[]} names - file names to move, in order
 * @param {string} [dir] - bundle directory (defaults to the resolved BUNDLE_DIR)
 * @returns {void}
 */
function swapIntoBundleDir(staging, names, dir = BUNDLE_DIR) {
    const backup = fs.mkdtempSync(path.join(dir, '.backup-'));
    const displaced = [];
    const placed = [];
    try {
        for (const name of names) {
            const target = path.join(dir, name);
            if (fs.existsSync(target)) {
                fs.renameSync(target, path.join(backup, name));
                displaced.push(name);
            }
            fs.renameSync(path.join(staging, name), target);
            placed.push(name);
        }
        // Every file is live. From here a crash leaves only a stale directory.
        fs.writeFileSync(path.join(backup, SWAP_DONE), '');
    }
    catch (err) {
        for (const name of placed) {
            fs.rmSync(path.join(dir, name), {force: true});
        }
        for (const name of displaced) {
            fs.renameSync(path.join(backup, name), path.join(dir, name));
        }
        throw err;
    }
    finally {
        fs.rmSync(backup, {recursive: true, force: true});
    }
}

/**
 * Rebuild the bundle plus its manifest.
 *
 * Everything is written into a staging directory alongside the target and moved
 * into place only once all four files exist. Writing straight into BUNDLE_DIR
 * would mean a failure partway through (a full disk, a killed process) leaves a
 * truncated cities.tsv.gz where the committed fallback used to be — and the
 * fallback is exactly what the caller reaches for when this script fails.
 * @returns {Promise<void>} resolves once the bundle is in place
 */
async function main() {
    fs.mkdirSync(BUNDLE_DIR, {recursive: true});
    recoverInterruptedSwap();
    const staging = fs.mkdtempSync(path.join(BUNDLE_DIR, '.staging-'));

    try {
        const citiesZip = await download(bundleUrl('cities1000.zip'));
        const admin1Raw = await download(bundleUrl('admin1CodesASCII.txt'));
        const countriesRaw = await download(bundleUrl('countryInfo.txt'));

        const citiesRaw = await extractFromZip(citiesZip, 'cities1000.txt');

        const projected = {
            'cities.tsv.gz': project(citiesRaw, CITY_COLUMNS, CITY_MIN_COLUMNS),
            'admin1.tsv.gz': project(admin1Raw, ADMIN1_COLUMNS, ADMIN1_MIN_COLUMNS),
            'countries.tsv.gz': project(countriesRaw, COUNTRY_COLUMNS, COUNTRY_MIN_COLUMNS)
        };

        const counts = {};
        for (const [name, result] of Object.entries(projected)) {
            counts[name] = result.rows;
        }
        const short = checkRowCounts(counts);
        if (short) {
            throw new Error(
                `Refusing to write a suspiciously small bundle: ${short}. `
                + 'The upstream format may have changed — check the column indexes in this script.'
            );
        }

        // The importer's own semantic checks, BEFORE anything replaces the
        // committed bundle: counts and digests cannot see a shifted or garbled
        // column, so a full-sized malformed download used to displace the
        // known-good fallback here, exit zero, and only fail at import — after
        // the documented fallback was already gone. Failing here leaves the
        // committed bundle exactly as it was.
        const projectedLines = {};
        for (const [name, result] of Object.entries(projected)) {
            projectedLines[name] = result.text.split('\n').filter(line => line.trim());
        }
        validateSemantics(projectedLines);

        const manifest = {
            _comment: 'GENERATED by bin/offline-geocoder/scripts/update_geonames_bundle.js — do not edit by hand.',
            // Redacted: this file ships inside the image and the installed bundle.
            source: redactUrl(BASE_URL),
            fetched: new Date().toISOString().slice(0, 10),
            license: 'GeoNames data, CC BY 4.0 — see ATTRIBUTION.md',
            files: {}
        };
        for (const [name, result] of Object.entries(projected)) {
            manifest.files[name] = {
                columns: FILES[name].columns,
                rows: result.rows,
                ...writeBundleFile(staging, name, result.text)
            };
        }
        fs.writeFileSync(path.join(staging, MANIFEST), JSON.stringify(manifest, null, 4) + os.EOL);

        // Only now is the staged bundle complete. Swap it in as a unit.
        //
        // Renaming file by file is atomic per file but not across the set, and the
        // `npm run geonames:update` writes straight into the committed bundle directory. A
        // crash after the first rename left some files new and MANIFEST.json still
        // describing the old set — which the importer rejects on its digest checks,
        // so the documented "fall back to the committed bundle" does not fall back
        // to anything and set -e aborts the install. Displace the old files into a
        // sibling directory first and put them back if any rename fails, so a
        // failure leaves the committed bundle exactly as it was.
        swapIntoBundleDir(staging, [...Object.keys(projected), MANIFEST]);

        console.log(`\nBundle written to ${BUNDLE_DIR}`);
        for (const [name, info] of Object.entries(manifest.files)) {
            console.log(`  ${name.padEnd(18)} ${String(info.rows).padStart(7)} rows  ${(info.bytes / 1048576).toFixed(2)} MB`);
        }
    }
    finally {
        fs.rmSync(staging, {recursive: true, force: true});
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
}

module.exports = { swapIntoBundleDir, recoverInterruptedSwap, redactUrl, bundleUrl, SWAP_DONE, BUNDLE_DIR };
