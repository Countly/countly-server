#!/usr/bin/env node

/**
 * This script runs the API documentation generation process:
 * 1. Merge all OpenAPI specs into one file
 * 2. Generate Swagger UI HTML documentation
 */

const { execFileSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting API documentation generation process...');

// Paths to the scripts
const scriptsDir = __dirname;
const mergeScript = path.join(scriptsDir, 'merge-openapi.js');
const swaggerScript = path.join(scriptsDir, 'generate-swagger-ui.js');

try {
    // Step 1: Merge OpenAPI specs
    console.log('\n📑 Step 1: Merging OpenAPI specifications...');
    execFileSync('node', [mergeScript], { stdio: 'inherit' });

    // Step 2: Generate Swagger UI documentation
    console.log('\n📙 Step 2: Generating Swagger UI documentation...');
    execFileSync('node', [swaggerScript], { stdio: 'inherit' });

    console.log('\n✅ API documentation generation completed successfully!');
    console.log('📊 Documentation is available in the doc/api directory:');
    console.log('   - Swagger UI: doc/api/swagger-ui-api.html');

}
catch (error) {
    console.error('\n❌ Error during API documentation generation:', error.message);
    process.exit(1);
}