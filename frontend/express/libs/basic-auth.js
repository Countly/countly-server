/**
 * Parse HTTP Basic credentials from a request, as the basic-auth package did
 * @module frontend/express/libs/basic-auth
 */

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/;
const USER_PASS_REGEXP = /^([^:]*):(.*)$/;

/**
 * Read the Authorization header of a request as Basic credentials
 * @param {object} req - request with a headers object
 * @returns {{name: string, pass: string}|undefined} credentials, or undefined when the header is missing or not valid Basic auth
 */
function basicAuth(req) {
    const header = req && req.headers && req.headers.authorization;
    if (typeof header !== "string") {
        return undefined;
    }
    const match = CREDENTIALS_REGEXP.exec(header);
    if (!match) {
        return undefined;
    }
    const userPass = USER_PASS_REGEXP.exec(Buffer.from(match[1], "base64").toString());
    if (!userPass) {
        return undefined;
    }
    return {name: userPass[1], pass: userPass[2]};
}

module.exports = basicAuth;
