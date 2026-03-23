# Offline Geocoder

Node library for reverse geocoding. Designed to be used offline (for example
embedded in a desktop or mobile application) - no web requests are made to
perform a lookup.

## Data

This uses data from the [GeoNames project](http://www.geonames.org/), which is
free to use under the [Creative Commons Attribution 3.0 license](http://creativecommons.org/licenses/by/3.0/).
To enable this to work offline, the data is imported into a SQLite database
which is roughly 12 MB, so easily embeddable within an application.

By default it uses the `cities1000` dataset which contains details of all
worldwide cities with a population of at least 1000 people. Depending on your
needs you may get better performance or accuracy by using one of their other
datasets.

The GeoNames data is limited to city-level granularity, so if you need street
level accuracy this won't work for you. Also most data is only available in
English. Take a look at the
[OpenStreetMap Nominatim project](https://github.com/twain47/Nominatim) for a
similar tool with a lot more features.

The advantages of this working offline are you don't need to pay or obtain a
license key, and it's fast. On my meager laptop I can perform around 300
lookups per second with a single process.

## Installation

```
npm install --save offline-geocoder
```

You also need to obtain a database which isn't included in the package, to
generate your own take a look in `scripts`.

## Usage

When you initialize the library you need to pass the location of the database:

```javascript
const geocoder = require('offline-geocoder')({ database: 'data/geodata.db' })
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
  formatted: 'Rome, Latium, Italy',
  country: { id: 'IT', name: 'Italy' },
  admin1: { id: 7, name: 'Latium' },
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
