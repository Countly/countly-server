/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

const fs = require('fs');
const path = require('path');

// Log dosyasının yolu
const networkLogPath = path.join(__dirname, '../logs/network.log');

module.exports = (on, config) => {
  on('task', {
    logNetworkRequest(logEntry) {
      fs.appendFileSync(networkLogPath, logEntry);
      return null;
    },
    logNetworkResponse(logEntry) {
      fs.appendFileSync(networkLogPath, logEntry);
      return null;
    },
    clearNetworkLogs() {
      if (fs.existsSync(networkLogPath)) {
        fs.truncateSync(networkLogPath, 0);
      }
      return null;
    }
  });
};