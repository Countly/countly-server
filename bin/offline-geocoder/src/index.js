"use strict";

const path         = require('path')
const { MongoClient } = require('mongodb')
const reverse      = require('./reverse')
const findLocation = require('./location').find
const fs           = require('fs')

const NO_DB = 'Database connection failed';

function Geocoder(options) {
  var geocoder = function(options) {
    this.options = options || {}
    
    if (this.options.dbUrl === undefined) {
      this.options.dbUrl = 'mongodb://localhost:27017'
    }
    
    if (this.options.dbName === undefined) {
      this.options.dbName = 'countly'
    }
    
    if (this.options.collectionPrefix === undefined) {
      this.options.collectionPrefix = 'geocoder_'
    }
    
    this.dbClient = null
    this.dbConnected = false
    
    // Setup MongoDB connection
    this.connect()
  }
  
  geocoder.prototype.connect = async function() {
    try {
      this.dbClient = new MongoClient(this.options.dbUrl)
      await this.dbClient.connect()
      this.db = this.dbClient.db(this.options.dbName)
      this.dbConnected = true
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err)
      this.dbConnected = false
    }
  }

  geocoder.prototype.reverse = async function(latitude, longitude, callback) {
    if (!this.dbConnected) {
      if (callback) {
        callback(NO_DB)
      }
      return Promise.reject(NO_DB)
    }
    return reverse(this, latitude, longitude, callback)
  }

  geocoder.prototype.location = async function(locationId, locationCountryId) {
    if (!this.dbConnected) {
      return Promise.reject(NO_DB)
    }

    return findLocation(this, locationId, locationCountryId);
  }
  
  geocoder.prototype.close = async function() {
    if (this.dbClient) {
      await this.dbClient.close()
      this.dbConnected = false
    }
  }

  return new geocoder(options)
}

module.exports = Geocoder;
