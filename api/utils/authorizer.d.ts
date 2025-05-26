import { Db } from "mongodb";

/**
 * Module providing one time authentication
 * @module api/utils/authorizer
 */
export interface AuthorizerOptions {
  db: Db;
  token: string;
  qstring?: any;
  req_path?: string;
  callback: (valid: any, expires_after?: number) => void;
  return_data?: boolean;
  ttl?: number;
  multi?: boolean;
  owner?: string;
  app?: string | string[];
  endpoint?: string | string[];
  purpose?: string;
  temporary?: boolean;
  tryReuse?: boolean;
}

export interface Authorizer {
  /**
   * Store token for later authentication
   * @function save
   * @name module:api/utils/authorizer.save
   * @param {object} options - options for the task
   * @param {object} options.db - database connection
   * @param {number} options.ttl - amount of seconds for token to work, 0 works indefinately
   * @param {bool} [options.multi=false] - if true, can be used many times until expired
   * @param {string} options.token - token to store, if not provided, will be generated
   * @param {string} options.owner - id of the user who created this token
   * @param {string} options.app - list of the apps for which token was created
   * @param {string} options.endpoint - regexp of endpoint(any string - is used as substring,to mach exact ^{yourpath}$)
   * @param {string} options.tryReuse - if true - tries to find not expired token with same parameters. If not founds cretes new token. If found - updates token expiration time to new one and returns token.
   * @param {bool} [options.temporary=false] - If logged in with temporary token. Doesn't kill other sessions on logout.
   * @param {function} options.callback - function called when saving was completed or errored, providing error object as first param and token string as second
   */
  save(options: AuthorizerOptions): void;
  /**
   * Get whole token information from database
   * @function read
   * @name module:api/utils/authorizer.read
   * @param {object} options - options for the task
   * @param {object} options.db - database connection
   * @param {string} options.token - token to read
   * @param {function} options.callback - function called when reading was completed or errored, providing error object as first param and token object from database as second
   */
  read(options: AuthorizerOptions): void;
  clearExpiredTokens(options: { db: Db }): void;
  /**
   * Checks if token is not expired yet
   * @function check_if_expired
   * @name module:api/utils/authorizer.check_if_expired
   * @param {object} options - options for the task
   * @param {object} options.db - database connection
   * @param {string} options.token - token to rvalidate
   * @param {function} options.callback - function called when reading was completed or errored, providing error object as first param, true or false if expired as second, seconds till expiration as third.(-1 if never expires, 0 - if expired)
   */
  check_if_expired(options: AuthorizerOptions): void;
  /**
   * extent token life spas
   * @function extend_token
   * @name module:api/utils/authorizer.extend_token
   * @param {object} options - options for the task
   * @param {object} options.db - database connection
   * @param {string} options.token - token to extend
   * @param {string} options.extendBy - extend token by given time(in ms)(optional) You have to provide extedBy or extendTill. extendBy==0 makes it never die
   * @param {string} options.extendTill - extend till given timestamp. (optional) You have to provide extedBy or extendTill
   * @param {function} options.callback - function called when reading was completed or errored, providing error object as first param and true as second if extending successful
   */
  extend_token(options: AuthorizerOptions): void;
  /**
   * Verify token and expire it
   * @function verify
   * @name module:api/utils/authorizer.verify
   * @param {object} options - options for the task
   * @param {object} options.db - database connection
   * @param {string} options.token - token to verify
   * @param {string} options.qstring - params.qstring. If not passed and there is limitation for this token on params - token will not be valid
   * @param {string} options.req_path - current request path
   * @param {function} options.callback - function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't
   */
  verify(options: AuthorizerOptions): void;
  /**
   * Similar to authorizer.verify. Only difference - return token owner if valid.
   * @function verify_return
   * @name module:api/utils/authorizer.verify_return
   * @param {object} options - options for the task
   * @param {object} options.db - database connection
   * @param {string} options.token - token to verify
   * @param {string} options.qstring - params.qstring. If not passed and there is limitation for this token on params - token will not be valid
   * @param {string} options.req_path - current request path
   * @param {function} options.callback - function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't
   */
  verify_return(options: AuthorizerOptions): void;
  getToken(): string;
  /**
   * Clean all expired tokens
   * @function clean
   * @name module:api/utils/authorizer.clean
   * @param {object} options - options for the task
   * @param {object} options.db - database connection
   * @param {function} options.callback - function called when cleaning completed
   */
  clean(options: { db: Db; callback: (err: any, result: any) => void }): void;
}

declare const authorizer: Authorizer;

export default authorizer;
