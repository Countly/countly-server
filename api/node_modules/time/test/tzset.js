var should = require('should')
  , time = require('../')

describe('tzset()', function () {

  beforeEach(function () {
    process.env.TZ = 'UTC'
  })

  it('should work with no arguments', function () {
    process.env.TZ = 'US/Pacific'
    time.tzset()
    time.currentTimezone.should.equal('US/Pacific')
  })

  it('should work with 1 argument', function () {
    time.tzset('US/Pacific')
    time.currentTimezone.should.equal('US/Pacific')
  })

  it('should return a "zoneinfo" object', function () {
    var info = time.tzset()
    info.should.have.property('tzname').with.lengthOf(2)
    info.should.have.property('timezone')
    info.should.have.property('daylight')
  })

  it('should set `process.env.TZ`', function () {
    time.tzset('US/Pacific')
    process.env.TZ.should.equal('US/Pacific')
  })

  it('should work with known values', function () {
    var info

    info = time.tzset('UTC')
    info.tzname[0].should.equal('UTC')
    info.timezone.should.equal(0)
    info.daylight.should.equal(0)

    info = time.tzset('America/Los_Angeles')
    info.tzname[0].should.equal('PST')
    info.tzname[1].should.equal('PDT')
    info.timezone.should.not.equal(0)

    info = time.tzset('America/Phoenix')
    info.tzname[0].should.equal('MST')
    info.tzname[1].should.equal('MDT')
    info.timezone.should.not.equal(0)

    info = time.tzset('Europe/Copenhagen')
    info.tzname[0].should.equal('CET')
    info.tzname[1].should.equal('CEST')
    info.timezone.should.not.equal(0)
  })

})
