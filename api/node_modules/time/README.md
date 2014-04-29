node-time
=========
### "[time.h][]" bindings for [NodeJS][Node].
[![Build Status](https://secure.travis-ci.org/TooTallNate/node-time.png?branch=master)](http://travis-ci.org/TooTallNate/node-time)


This module offers simple bindings for the C [time.h][] APIs.
It also offers an extended native `Date` object with `getTimezone()`
and `setTimezone()` functions, which aren't normally part of JavaScript.


Installation
------------

`node-time` is available through npm:

``` bash
$ npm install time
```


Example
-------

``` javascript
var time = require('time');

// Create a new Date instance, representing the current instant in time
var now = new time.Date();

now.setTimezone("America/Los_Angeles");
// `.getDate()`, `.getDay()`, `.getHours()`, etc.
// will return values according to UTC-8

now.setTimezone("America/New_York");
// `.getDate()`, `.getDay()`, `.getHours()`, etc.
// will return values according to UTC-5


// You can also set the timezone during instantiation
var azDate = new time.Date(2010, 0, 1, 'America/Phoenix');
azDate.getTimezone(); // 'America/Phoenix'
```

### Extending the global `Date` object

`node-time` provides a convenient `time.Date` object, which is its own Date
constructor independent from your own (or the global) Date object. There are often
times, however, when you would like the benefits of node-time on *all* Date
instances. To extend the global Date object, simply pass it in as an argument to
the node-time module when requiring:

``` js
var time = require('time')(Date);

var d = new Date();
d.setTimezone('UTC');
```


API
---


### Date() -> Date
#### new time.Date()
#### new time.Date(millisecondsFromUTC)
#### new time.Date(dateString [, timezone ])
#### new time.Date(year, month, day [, hour, minute, second, millisecond ] [, timezone ])

A special `Date` constructor that returns a "super" Date instance, that has
magic _timezone_ capabilities! You can also pass a `timezone` as the last
argument in order to have a Date instance in the specified timezone.

``` javascript
var now = new time.Date();
var another = new time.Date('Aug 9, 1995', 'UTC');
var more = new time.Date(1970, 0, 1, 'Europe/Amsterdam');
```


#### date.setTimezone(timezone [, relative ]) -> Undefined

Sets the timezone for the `Date` instance. By default this function makes it so
that calls to `getHours()`, `getDays()`, `getMinutes()`, etc. will be relative to
the timezone specified. If you pass `true` in as the second argument, then
instead of adjusting the local "get" functions to match the specified timezone,
instead the internal state of the Date instance is changed, such that the local
"get" functions retain their values from before the setTimezone call.

``` javascript
date.setTimezone("America/Argentina/San_Juan")

// Default behavior:
a = new time.Date()
a.toString()
// 'Wed Aug 31 2011 09:45:31 GMT-0700 (PDT)'
a.setTimezone('UTC')
a.toString()
// 'Wed Aug 31 2011 16:45:31 GMT+0000 (UTC)'

// Relative behavior:
b = new time.Date()
b.toString()
// 'Wed Aug 31 2011 10:48:03 GMT-0700 (PDT)'
b.setTimezone('UTC', true)
b.toString()
// 'Wed Aug 31 2011 10:48:03 GMT+0000 (UTC)'
```


#### date.getTimezone() -> String

Returns a String containing the currently configured timezone for the date instance.
This must be called _after_ `setTimezone()` has been called.

``` javascript
date.getTimezone();
  // "America/Argentina/San_Juan"
```


#### date.getTimezoneAbbr() -> String

Returns the abbreviated timezone name, also taking daylight savings into consideration.
Useful for the presentation layer of a Date instance.

``` javascript
date.getTimezoneAbbr();
  // "ART"
```


### Date.parse(dateStr [, timezone ]) -> Number

Same as the native JavaScript `Date.parse()` function, only this version allows
for a second, optional, `timezone` argument, which specifies the timezone in
which the date string parsing will be resolved against. This function is also
aliased as `time.parse()`.

``` javascript
time.Date.parse("1970, January 1");  // <- Local Time
  // 28800000
time.Date.parse("1970, January 1", "Europe/Copenhagen");
  // -3600000
time.Date.parse("1970, January 1", "UTC");
  // 0
```


### extend(date) -> Date

Transforms a "regular" Date instance into one of `node-time`'s "extended" Date instances.

``` javascript
var d = new Date();
// `d.setTimezone()` does not exist...
time.extend(d);
d.setTimezone("UTC");
```


### time() -> Number

Binding for `time()`. Returns the number of seconds since Jan 1, 1900 UTC.
These two are equivalent:

``` javascript
time.time();
  // 1299827226
Math.floor(Date.now() / 1000);
  // 1299827226
```


### tzset(timezone) -> Object

Binding for `tzset()`. Sets up the timezone information that `localtime()` will
use based on the specified _timezone_ variable, or the current `process.env.TZ`
value if none is specified. Returns an Object containing information about the
newly set timezone, or throws an Error if no timezone information could be loaded
for the specified timezone.

``` javascript
time.tzset('US/Pacific');
  // { tzname: [ 'PST', 'PDT' ],
  //   timezone: 28800,
  //   daylight: 1 }
```


### localtime(Number) -> Object

Binding for `localtime()`. Accepts a Number with the number of seconds since the
Epoch (i.e. the result of `time()`), and returns a "broken-down" Object
representation of the timestamp, according the the currently configured timezone
(see `tzset()`).

``` javascript
time.localtime(Date.now()/1000);
  // { seconds: 38,
  //   minutes: 7,
  //   hours: 23,
  //   dayOfMonth: 10,
  //   month: 2,
  //   year: 111,
  //   dayOfWeek: 4,
  //   dayOfYear: 68,
  //   isDaylightSavings: false,
  //   gmtOffset: -28800,
  //   timezone: 'PST' }
```


### currentTimezone -> String

The `currentTimezone` property always contains a String to the current timezone
being used by `node-time`. This property is reset every time the `tzset()`
function is called. Individual `time.Date` instances may have independent
timezone settings than what this one is...


[Node]: http://nodejs.org
[time.h]: http://en.wikipedia.org/wiki/Time.h
