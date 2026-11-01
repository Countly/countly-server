/**
 * Shape of a GeoNames bundle, shared by the writer and the reader.
 *
 * update_geonames_bundle.js validates against this before writing, and
 * import_geonames_mongodb.js validates against it before dropping the
 * geocoder_* collections. Keeping the thresholds here means the two can never
 * drift into a state where one would happily produce a bundle the other
 * rejects — or worse, accept one it should not.
 *
 * minRows is a floor, not the real row count: it exists to catch a truncated
 * download, a stub file from a broken mirror, or an upstream column change that
 * makes the projection drop nearly every row. The current dataset carries about
 * 170k cities, 3.8k admin1 records and 250 countries.
 */

const MANIFEST = 'MANIFEST.json';

const FILES = {
    'cities.tsv.gz': {
        columns: ['geonameid', 'name', 'latitude', 'longitude', 'country_code', 'admin1_code', 'timezone'],
        minRows: 100000
    },
    'admin1.tsv.gz': {
        columns: ['admin1_full_code', 'name'],
        minRows: 1000
    },
    'countries.tsv.gz': {
        columns: ['country_code', 'name'],
        minRows: 200
    }
};

/**
 * Check a set of row counts against the per-file floors.
 * @param {Object<string, number>} counts - rows seen per bundle file name
 * @returns {string|null} an error message naming every file that is short, or null
 */
function checkRowCounts(counts) {
    const short = Object.keys(FILES)
        .filter(name => !(counts[name] >= FILES[name].minRows))
        .map(name => `${name} has ${counts[name] === undefined ? 'no' : counts[name]} rows, expected at least ${FILES[name].minRows}`);

    return short.length ? short.join('; ') : null;
}

/**
 * Semantic validation of a bundle's rows, shared by the writer and the reader.
 *
 * The writer runs this BEFORE swapping a freshly downloaded bundle over the
 * committed known-good one: row counts and digests cannot see a shifted or
 * garbled column, so a full-sized malformed download used to replace the
 * fallback and only fail later, at import time, when the fallback was already
 * gone. The reader (parseBundle) runs the same checks at load, so the two can
 * never disagree about what a valid bundle is.
 *
 * Rows too short to project are skipped, exactly as both parsers skip them.
 * An EMPTY city country code is allowed: genuine GeoNames data carries a
 * handful (disputed territories), and it degrades to "no country" rather than
 * misjoining.
 * @param {Object<string, string[]>} lines - non-empty lines per bundle file name
 * @throws {Error} naming the first offending row
 */
function validateSemantics(lines) {
    const countries = new Set();
    for (const line of lines['countries.tsv.gz'] || []) {
        const fields = line.split('\t');
        if (fields.length < 2) {
            continue;
        }
        if (!/^[A-Z]{2}$/.test(fields[0])) {
            throw new Error(
                `Refusing this GeoNames bundle: countries row has a malformed country code `
                + `${JSON.stringify(fields[0])} (expected ISO alpha-2) — the column layout has `
                + 'likely changed.'
            );
        }
        if (countries.has(fields[0])) {
            throw new Error(
                `Refusing this GeoNames bundle: countries file repeats code ${JSON.stringify(fields[0])} — `
                + 'duplicate join keys make country lookups arbitrary.'
            );
        }
        countries.add(fields[0]);
    }

    const admin1 = new Set();
    for (const line of lines['admin1.tsv.gz'] || []) {
        const fields = line.split('\t');
        if (fields.length < 2) {
            continue;
        }
        const idParts = fields[0].split('.');
        if (idParts.length !== 2 || !idParts[0] || !idParts[1]) {
            throw new Error(
                `Refusing this GeoNames bundle: admin1 row has a malformed key `
                + `${JSON.stringify(fields[0])} (expected "<country_code>.<admin1_code>") — `
                + 'the column layout has likely changed.'
            );
        }
        if (admin1.has(fields[0])) {
            throw new Error(
                `Refusing this GeoNames bundle: admin1 file repeats key ${JSON.stringify(fields[0])} — `
                + 'duplicate join keys make region lookups arbitrary.'
            );
        }
        admin1.add(fields[0]);
        if (!countries.has(idParts[0])) {
            throw new Error(
                `Refusing this GeoNames bundle: admin1 row ${JSON.stringify(fields[0])} `
                + 'names a country the countries file does not contain — the files are inconsistent '
                + 'or a column has shifted.'
            );
        }
    }

    const cityIds = new Set();
    // City rows may name an admin1 region that the admin1 file does not carry —
    // genuine GeoNames data holds a small tail of these ("XX.00" unknown-region
    // codes and a few real gaps; 283 of 170,852 rows, 0.17%, in the current
    // dataset). Per-row refusal would reject the real upstream bundle, so the
    // check is a ratio: a shifted or corrupted admin1 column orphans nearly
    // every row and is refused decisively, while the genuine tail passes.
    let admin1Orphans = 0;
    let cityRows = 0;
    for (const line of lines['cities.tsv.gz'] || []) {
        const fields = line.split('\t');
        if (fields.length < 7) {
            continue;
        }
        // The geonameid is the join key between features and coordinates, and
        // parseInt would happily produce NaN ("abc") or a partial number
        // ("12abc" -> 12) — NaN joins NaN in Mongo, so a garbled id column
        // returns arbitrary locations while digests and row counts still pass.
        if (!/^\d+$/.test(fields[0]) || !Number.isSafeInteger(parseInt(fields[0]))) {
            throw new Error(
                `Refusing this GeoNames bundle: cities row has a non-numeric geonameid `
                + `${JSON.stringify(fields[0])} — the column layout has likely changed.`
            );
        }
        const id = parseInt(fields[0]);
        if (cityIds.has(id)) {
            throw new Error(
                `Refusing this GeoNames bundle: cities file repeats geonameid ${id} — `
                + 'duplicate join keys pair coordinates with arbitrary features.'
            );
        }
        cityIds.add(id);
        // Complete numeric tokens, not parseFloat prefixes: "40.7oops" parses
        // to 40.7, so a partially corrupted coordinate column loaded silently
        // altered locations while digests and row counts described the same
        // malformed input.
        if (!/^-?\d+(\.\d+)?$/.test(fields[2]) || !/^-?\d+(\.\d+)?$/.test(fields[3])) {
            throw new Error(
                `Refusing this GeoNames bundle: cities row for geonameid ${id} has a non-numeric `
                + `coordinate token (lat=${JSON.stringify(fields[2])} lng=${JSON.stringify(fields[3])}) — `
                + 'the column is corrupted or has shifted.'
            );
        }
        const latitude = parseFloat(fields[2]);
        const longitude = parseFloat(fields[3]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
            || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new Error(
                `Refusing this GeoNames bundle: cities row for geonameid ${fields[0]} has unusable `
                + `coordinates (lat=${JSON.stringify(fields[2])} lng=${JSON.stringify(fields[3])}) — `
                + 'the column layout has likely changed.'
            );
        }
        if (fields[4] && !countries.has(fields[4])) {
            throw new Error(
                `Refusing this GeoNames bundle: cities row for geonameid ${id} has country `
                + `code ${JSON.stringify(fields[4])} that the countries file does not `
                + 'contain — the files are inconsistent or a column has shifted.'
            );
        }
        cityRows++;
        if (fields[4] && fields[5] && !admin1.has(fields[4] + '.' + fields[5])) {
            admin1Orphans++;
        }
    }
    if (cityRows && admin1Orphans / cityRows > 0.01) {
        throw new Error(
            `Refusing this GeoNames bundle: ${admin1Orphans} of ${cityRows} city rows name an `
            + 'admin1 region the admin1 file does not contain (over the 1% tolerance for the '
            + 'genuine upstream tail) — the admin1 column has likely shifted or the files are '
            + 'inconsistent.'
        );
    }
}

module.exports = { MANIFEST, FILES, checkRowCounts, validateSemantics };
