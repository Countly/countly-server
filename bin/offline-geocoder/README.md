# Offline Geocoder

Node library for reverse geocoding. Designed to be used offline (for example
embedded in a desktop or mobile application) - no web requests are made to
perform a lookup.

## Data

This uses data from the [GeoNames project](http://www.geonames.org/), which is
free to use under the [Creative Commons Attribution 4.0 license](https://creativecommons.org/licenses/by/4.0/).

In Countly the data lives in MongoDB, in the `geocoder_features`,
`geocoder_coordinates`, `geocoder_admin1` and `geocoder_countries` collections.
It uses the `cities1000` dataset, which covers every city with a population of
at least 1000 people.

### Where the data comes from

`bundled/` holds a projected, gzipped copy committed to this repository (about
3 MB) with a `MANIFEST.json` recording its vintage, row counts and SHA-256
digests. Every checkout, image and air-gapped install has the same data with no
network at all, the same way city coordinates come from the bundled
`all-the-cities` package. Nothing at install, start or request time downloads
anything.

### Loading it into MongoDB

```
node bin/offline-geocoder/scripts/import_geonames_mongodb.js --if-changed
```

Each file is checked against its manifest digest first, so a corrupt or
hand-edited bundle is an error rather than silently wrong geography. The new data
is built in staging collections and renamed into place, so lookups never see
empty collections. Every load records the bundle's fingerprint in
`plugins.{_id: 'geonames_bundle'}`; with `--if-changed` the script does nothing
when that bundle is already loaded and intact.

It runs from:

- `bin/countly.install_ubuntu.sh` and `bin/countly.install_rhel.sh`, on a new install;
- `bin/docker/postinstall.sh`, at every start of an API container, so a newer
  image's bundle reaches an existing database;
- `countly upgrade`, on every update of an existing install, before the restart;
- `bin/upgrade/25.03/upgrade_db.sh`, for installs upgraded from the sqlite-based
  geocoder.

Only one process loads at a time, holding a lease in
`plugins.{_id: 'geonames_bundle_load'}` that it renews while it loads. The others
wait up to three minutes for it to finish, then check again. A lease left by a
killed loader expires within two minutes, so a waiting process takes over the
load instead of starting the API on missing data.

To load a bundle from somewhere other than `bundled/` (a mounted volume, say),
point `COUNTLY_GEONAMES_BUNDLE_DIR` at a directory holding the same four files.

### Refreshing the committed bundle

`update_geonames_bundle.js` is the only script here that downloads anything. Run
it from a dev checkout, then commit what changed under `bundled/`:

```
npm run geonames:update
```

Set `GEONAMES_BASE_URL` to pull from an internal mirror instead of
`download.geonames.org`, and `--out <dir>` to stage a bundle somewhere other than
the tree. The script refuses to write a bundle that parses to implausibly few
rows, so an upstream column change fails loudly rather than quietly shipping
empty geography.

The GeoNames data is limited to city-level granularity, so if you need street
level accuracy this won't work for you. Also most data is only available in
English. Take a look at the
[OpenStreetMap Nominatim project](https://github.com/twain47/Nominatim) for a
similar tool with a lot more features.

The advantages of this working offline are you don't need to pay or obtain a
license key, and it's fast. On my meager laptop I can perform around 300
lookups per second with a single process.

## Usage

The Countly build of this library reads from MongoDB. Pass `getDb` to share a
connection you already hold; without it, the first lookup connects through
`pluginManager`:

```javascript
const geocoder = require('./bin/offline-geocoder/src/index.js')({getDb: () => common.db})
```

### Reverse Geocoding

To perform a revese geocode lookup just pass the coordinates:

```javascript
geocoder.reverse(41.89, 12.49)
  .then(function(result) {
    console.log(result)
  })
  .catch(function(error) {
    console.error(error)
  })
```

Which outputs:

```
{ id: 3169070,
  name: 'Rome',
  formatted: 'Rome, Lazio, Italy',
  country: { id: 'IT', name: 'Italy' },
  admin1: { id: '07', name: 'Lazio' },
  coordinates: { latitude: 41.89193, longitude: 12.51133 } }
```

The library also has a callback interface:

```javascript
geocoder.reverse(41.89, 12.49, function(error, result) {
  console.log(result)
})
```

## License

This library is licensed under [the MIT license](https://github.com/lucaspiller/offline-geocoder/blob/master/LICENSE).

You don't need to give this library attribution, but you must do so for
GeoNames if you use their data!
