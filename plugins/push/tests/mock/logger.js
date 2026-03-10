/**
 * @typedef {import("../../../../types/log.ts").Logger} Logger
 */
const sinon = require('sinon');

module.exports = {
    createSilentLogger() {
        return sinon.stub(/** @type {Logger} */({
            d() {},
            i() {},
            w() {},
            e() {},
        }));
    }
};