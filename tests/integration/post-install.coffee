# This test checks that everything is set up correctly
# after running the countly.install.sh script

assert = require 'assert'
http = require 'http'
expect = require('chai').expect

check_http = (done, port_num, expected_http_code, path = '/') ->
  req = http.request(
     hostname: 'localhost',
     port: port_num,
     path: path
  , (res) ->
    expect(res.statusCode).to.equal(expected_http_code)
    done()
  )
  req.on 'error', (e) ->
    done(e)
  req.end()

describe 'Countly', () ->
  describe 'API', () ->
    describe 'runs on port 3001', () ->
      it 'responds to /i', (done) ->
        # will complain about missing API key
        check_http(done, 3001, 400, '/i')
      it 'responds to /o', (done) ->
        check_http(done, 3001, 400, '/o')

  describe 'Frontend', () ->
    it 'runs on port 6001', (done) ->
      # will redirect to login or setup
      check_http(done, 6001, 302)

  describe 'Web-Proxy', () ->
    it 'runs on port 80', (done) ->
      check_http(done, 80, 302)
    it 'responds to /i', (done) ->
      check_http(done, 80, 400, '/i')
    it 'responds to /o', (done) ->
      check_http(done, 80, 400, '/o')
