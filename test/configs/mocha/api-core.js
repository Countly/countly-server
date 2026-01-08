/**
 * Mocha config for API core tests
 */
module.exports = {
    bail: false, // Continue running after failures
    spec: [
        'test/1.frontend/**/*.js',
        'test/2.api/**/*.js',
        'test/3.api.write/**/*.js',
        'test/5.cleanup/**/*.js'
    ],
    ignore: ['**/*.unit.js'],
    require: ['test/configs/mocha/integration-hooks.js'],
    reporter: 'spec',
    timeout: 180000 // 3 minutes - beforeAll needs ~50s+ for service startup and 40s stabilization
};
