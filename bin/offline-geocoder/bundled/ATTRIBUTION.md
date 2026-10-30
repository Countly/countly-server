# GeoNames data attribution

The `.tsv.gz` files in this directory are derived from the GeoNames geographical
database:

- Source: <https://download.geonames.org/export/dump/> (`cities1000.zip`,
  `admin1CodesASCII.txt`, `countryInfo.txt`)
- Licence: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
- Copyright: GeoNames, <https://www.geonames.org/>

## What was changed

The upstream files carry roughly 19 tab-separated columns. Countly's importer
stores 7 of them, so the bundle is projected down to those columns and gzipped
before being committed — see `MANIFEST.json` for the exact column order of each
file, and `../scripts/update_geonames_bundle.js` for the projection itself. No
values are altered; rows are only dropped when they are blank, a `#` comment, or
shorter than the upstream format allows.

The data is committed here as the floor: it guarantees that installing Countly —
including into an air-gapped network — never requires reaching
`download.geonames.org`. Image builds fetch a fresher copy over the top when they
can, and fall back to this one when they cannot.
