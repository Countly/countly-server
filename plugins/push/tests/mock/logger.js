/**
 * @typedef {import("../../../../types/log").Logger} Logger
 */
const sinon = require('sinon');

module.exports = {
    createSilentLogger() {
        return sinon.stub(/** @type {Logger} */({
            d(){},
            i(){},
            w(){},
            e(){},
        }));
    }
}