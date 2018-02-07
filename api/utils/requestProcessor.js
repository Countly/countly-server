const Promise = require('bluebird');
const common = require('./common.js');
const {validateUser, validateUserForRead, validateUserForWrite, validateGlobalAdmin} = require('./rights.js');
const authorize = require('./authorizer.js');
const plugins = require('../../plugins/pluginManager.js');
const versionInfo = require('../../frontend/express/version.info');
const log = require('./log.js')('core:api');
const validateUserForWriteAPI = validateUser;
const validateUserForDataReadAPI = validateUserForRead;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;
const validateUserForMgmtReadAPI = validateUser;

