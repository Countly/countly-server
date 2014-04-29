var should = require('should')
  , assert = require('assert')
  , time = require('../')

describe('exports', function () {

  it('should be a function', function () {
    time.should.be.a('function')
  })

  it('should return itself when invoked', function () {
    var dummy = function () {}
    time(dummy).should.equal(time)
  })

  it('should add node-time extensions to the passed in function\'s prototype'
  , function () {
    var dummy = function () {}
      , proto = dummy.prototype

    proto.should.not.have.property('setTimezone')
    proto.should.not.have.property('getTimezone')
    proto.should.not.have.property('getTimezoneAbbr')
    time(dummy)
    proto.should.have.property('setTimezone')
    proto.should.have.property('getTimezone')
    proto.should.have.property('getTimezoneAbbr')

  })

  it('should throw if in invalid object is passed into it', function () {
    time.should.throw()
  })

  it('should have a "currentTimezone" property', function () {
    time.should.have.property('currentTimezone')
    assert(time.currentTimezone)
  })

  describe('localtime()', function () {

    // GH-40
    it('should not segfault on a NaN Date value', function () {
      var invalid = new Date(NaN)
      var local = time.localtime(invalid.getTime())
      assert.deepEqual({ invalid: true }, local)
    });

  });

  describe('Date', function () {

    it('should have a "Date" property', function () {
      time.should.have.property('Date')
    })

    it('should *not* be the global "Date" object', function () {
      time.Date.should.not.equal(Date)
    })

    it('should return a real "Date" instance', function () {
      var d = new time.Date
      Object.prototype.toString.call(d).should.equal('[object Date]')
    })

    it('should pass `time.Date` instanceof', function () {
      var d = new time.Date
        , test = d instanceof time.Date
      test.should.be.true
    })

    it('should not pass global instanceof', function () {
      var d = new time.Date
        , test = d instanceof Date
      test.should.be.false
    })

    it('should already have the node-time extensions', function () {
      should.exist(time.Date.prototype.setTimezone)
      should.exist(time.Date.prototype.getTimezone)
      should.exist(time.Date.prototype.getTimezoneAbbr)
    })

    it('should have all the regular Date properties', function () {
      time.Date.should.have.property('now')
      time.Date.should.have.property('parse')
      time.Date.should.have.property('UTC')
    })

  })

})
