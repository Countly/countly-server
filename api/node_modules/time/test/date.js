var should = require('should')
  , time = require('../')

describe('Date', function () {

  describe('constructor', function() {

    it('should parse strings relative to TZ', function() {

      var d = new time.Date('2012-1-12 02:00 PM', 'America/New_York')
      d.getTime().should.equal(1326394800000)
      d.getTimezone().should.equal('America/New_York')

      d = new time.Date('2012-1-12 02:00 PM', 'America/Los_Angeles')
      d.getTime().should.equal(1326405600000)
      d.getTimezone().should.equal('America/Los_Angeles')
    })

    it('should interpret date parts relative to TZ', function() {

      var d = new time.Date(2012, 0, 12, 14, 'America/New_York')
      d.getTime().should.equal(1326394800000)
      d.getFullYear().should.equal(2012)
      d.getTimezone().should.equal('America/New_York')

      d = new time.Date(2012, 0, 12, 14, 'America/Los_Angeles')
      d.getTime().should.equal(1326405600000)
      d.getTimezone().should.equal('America/Los_Angeles')
    })

    it('should accept milliseconds regardless of TZ', function() {

      var d1 = new time.Date(1352005200000, 'America/New_York')
      var d2 = new time.Date(1352005200000, 'America/Los_Angeles')

      d1.getTime().should.equal(d2.getTime())
      d1.getTimezone().should.equal('America/New_York')
      d2.getTimezone().should.equal('America/Los_Angeles')
    })


    it('should parse strings around 2038', function() {

      //Before threshold
      var d = new time.Date('2037-12-31 11:59:59 PM', 'UTC')
      d.getTime().should.equal(2145916799000)
      //After threshold
      d = new time.Date('2038-01-01 00:00:00 AM', 'UTC')
      d.getTime().should.equal(2145916800000)
      
      //Before threshold
      d = new time.Date('2038-1-19 03:14:06 AM', 'UTC')
      d.getTime().should.equal(2147483646000)
      //After threshold
      d = new time.Date('2038-1-19 03:14:07 AM', 'UTC')
      d.getTime().should.equal(2147483647000)
    })
  })

  it('should accept js1.3 extended set* arguments', function() {

    var d = new time.Date(2000, 1, 2, 3, 4, 5, 6, 'America/Chicago');
    d.setFullYear(2001, 2, 3);
    d.getTime().should.equal(983610245006);
    d.setFullYear(2002, 3);
    d.getTime().should.equal(1017824645006);
    d.setMonth(4, 5);
    d.getTime().should.equal(1020585845006);
    d.setHours(4, 5, 6, 7);
    d.getTime().should.equal(1020589506007);
    d.setHours(5, 6, 7);
    d.getTime().should.equal(1020593167007);
    d.setHours(6, 7);
    d.getTime().should.equal(1020596827007);
    d.setMinutes(8, 9, 10);
    d.getTime().should.equal(1020596889010);
    d.setMinutes(9, 10);
    d.getTime().should.equal(1020596950010);
    d.setSeconds(11, 12);
    d.getTime().should.equal(1020596951012);
  })

  it('should accept js1.3 extended setUTC* arguments', function() {

    var d = new time.Date(2000, 1, 2, 3, 4, 5, 6, 'America/Chicago');
    d.setUTCFullYear(2001, 2, 3);
    d.getTime().should.equal(983610245006);
    d.setUTCFullYear(2002, 3);
    d.getTime().should.equal(1017824645006);
    d.setUTCMonth(4, 5);
    d.getTime().should.equal(1020589445006);
    d.setUTCHours(4, 5, 6, 7);
    d.getTime().should.equal(1020571506007);
    d.setUTCHours(5, 6, 7);
    d.getTime().should.equal(1020575167007);
    d.setUTCHours(6, 7);
    d.getTime().should.equal(1020578827007);
    d.setUTCMinutes(8, 9, 10);
    d.getTime().should.equal(1020578889010);
    d.setUTCMinutes(9, 10);
    d.getTime().should.equal(1020578950010);
    d.setUTCSeconds(11, 12);
    d.getTime().should.equal(1020578951012);
  })

  describe('#setTimezone()', function () {

    beforeEach(function () {
      time.tzset('UTC')
    })

    it('should clean up after itself', function () {
      var initial = process.env.TZ
        , d = new time.Date()
      d.setTimezone('America/Argentina/San_Juan')
      initial.should.equal(process.env.TZ)
    })

    it('should be chainable', function () {
      var initial = process.env.TZ
        , d = new time.Date().setTimezone('America/Argentina/San_Juan')
      d.getTimezone().should.equal('America/Argentina/San_Juan')
    })

    it('should change the "timezone offset"', function () {
      var d = new time.Date()
        , offset = d.getTimezoneOffset()
      d.setTimezone('US/Pacific')
      d.getTimezoneOffset().should.not.equal(offset)
    })

    it('should match the UTC values when set to "UTC"', function () {
      var d = new time.Date()
      d.setTimezone('UTC')
      d.getUTCDay().should.equal(d.getDay())
      d.getUTCDate().should.equal(d.getDate())
      d.getUTCFullYear().should.equal(d.getFullYear())
      d.getUTCHours().should.equal(d.getHours())
      d.getUTCMilliseconds().should.equal(d.getMilliseconds())
      d.getUTCMinutes().should.equal(d.getMinutes())
      d.getUTCMonth().should.equal(d.getMonth())
      d.getUTCSeconds().should.equal(d.getSeconds())
      d.getTimezoneOffset().should.equal(0)
    })

    it('should especially change the "hours" value', function () {
      var d = new time.Date()
        , hours = d.getHours()

      d.setTimezone('US/Pacific')
      d.getHours().should.not.equal(hours)
      hours = d.getHours()

      d.setTimezone('US/Eastern')
      d.getHours().should.not.equal(hours)
      hours = d.getHours()

      d.setTimezone('America/Argentina/San_Juan')
      d.getHours().should.not.equal(hours)
    })


    describe('relative', function () {

      it('should change the timezone', function () {
        var d = new time.Date()
        d.setTimezone('US/Pacific', true)
        d.getTimezone().should.not.equal(process.env.TZ)
      })

      it('should keep local values', function () {
        var d = new time.Date()
          , millis = d.getMilliseconds()
          , seconds = d.getSeconds()
          , minutes = d.getMinutes()
          , hours = d.getHours()
          , date = d.getDate()
          , month = d.getMonth()
          , year = d.getFullYear()
        d.setTimezone('US/Pacific', true)

        d.getMilliseconds().should.equal(millis)
        d.getSeconds().should.equal(seconds)
        d.getMinutes().should.equal(minutes)
        d.getHours().should.equal(hours)
        d.getDate().should.equal(date)
        d.getMonth().should.equal(month)
        d.getFullYear().should.equal(year)
      })

      it('should change the date\'s internal time value', function () {
        var d = new time.Date()
          , old = d.getTime()
        d.setTimezone('US/Pacific', true)
        d.getTime().should.not.equal(old)
      })

      it('should calculate correctly when UTC date is day after timezone date', function () {
        var forwards = {
            timezone: 'US/Pacific', hour: 22, minute: 47,
            year: 2013, month: 1, date: 31
        };
        var d = new time.Date(
          forwards.year, forwards.month - 1, forwards.date,
          forwards.hour, forwards.minute, 1, 1, forwards.timezone
        );
        d.toString().should.equal('Thu Jan 31 2013 22:47:01 GMT-0800 (PST)');
        d.setTimezone('UTC');
        d.toString().should.equal('Fri Feb 01 2013 06:47:01 GMT+0000 (UTC)');
      })

      it('should calculate correctly when UTC date is day before timezone date', function () {
        var d = new time.Date(2010, 0, 31, 19, 0, 0, 0, 'UTC');
        d.toString().should.equal('Sun Jan 31 2010 19:00:00 GMT+0000 (UTC)')

        var backwards = {
            timezone: 'Australia/Sydney', hour: 2, minute: 47,
            year: 2013, month: 2, date: 1
        };

        var d2 = new time.Date(
          backwards.year, backwards.month - 1, backwards.date,
          backwards.hour, backwards.minute, 1, 1, backwards.timezone
        );
        d2.toString().should.equal('Fri Feb 01 2013 02:47:01 GMT+1100 (EST)');
        d2.setTimezone('UTC');
        d2.toString().should.equal('Thu Jan 31 2013 15:47:01 GMT+0000 (UTC)');
      })

      it('should calculate correctly on edge of months', function() {
        var d = new time.Date("2013-02-01 01:02:03", 'US/Pacific');
        d.toString().should.equal('Fri Feb 01 2013 01:02:03 GMT-0800 (PST)');
        d.setTimezone('UTC');
        d.toString().should.equal('Fri Feb 01 2013 09:02:03 GMT+0000 (UTC)');
      })

    })

  })
})
