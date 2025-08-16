#!/usr/bin/env node

/**
 * This script merges multiple OpenAPI specification files into a single file.
 * It's used for generating comprehensive API documentation.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const openapiDir = path.join(__dirname, '../../openapi');
const outputDir = path.join(__dirname, '../../doc/api');
const mergedSpecPath = path.join(outputDir, 'openapi-merged.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Merging OpenAPI specifications...');

// Find all OpenAPI spec files (.json)
const specFiles = fs.readdirSync(openapiDir)
    .filter(file => file.endsWith('.json') && !file.startsWith('.'))
    .map(file => path.join(openapiDir, file));

if (specFiles.length === 0) {
    console.error('No OpenAPI specification files found in', openapiDir);
    process.exit(1);
}

// Load and merge all specs
let mergedSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Countly API Documentation',
        description: 'Combined API documentation for all Countly modules',
        version: '1.0.0'
    },
    servers: [],
    paths: {},
    components: {
        schemas: {},
        securitySchemes: {}
    }
};

console.log(`Found ${specFiles.length} OpenAPI specification files to merge.`);

specFiles.forEach(file => {
    try {
        console.log(`Processing file: ${path.basename(file)}`);
        const content = fs.readFileSync(file, 'utf8');
        const spec = JSON.parse(content);

        // Merge servers if they exist
        if (spec.servers && spec.servers.length > 0) {
            // Avoid duplicate servers
            spec.servers.forEach(server => {
                if (!mergedSpec.servers.some(s => s.url === server.url)) {
                    mergedSpec.servers.push(server);
                }
            });
        }

        // Merge paths
        if (spec.paths) {
            Object.assign(mergedSpec.paths, spec.paths);
        }

        // Merge components if they exist
        if (spec.components) {
            // Merge schemas
            if (spec.components.schemas) {
                Object.assign(mergedSpec.components.schemas, spec.components.schemas);
            }

            // Merge securitySchemes
            if (spec.components.securitySchemes) {
                Object.assign(mergedSpec.components.securitySchemes, spec.components.securitySchemes);
            }

            // Add other component types if needed
            ['parameters', 'responses', 'examples', 'requestBodies', 'headers'].forEach(type => {
                if (spec.components[type]) {
                    if (!mergedSpec.components[type]) {
                        mergedSpec.components[type] = {};
                    }
                    Object.assign(mergedSpec.components[type], spec.components[type]);
                }
            });
        }
    }
    catch (error) {
        console.error(`Error processing file ${file}:`, error.message);
    }
});

// Write the merged spec to a JSON file
try {
    fs.writeFileSync(mergedSpecPath, JSON.stringify(mergedSpec, null, 2));
    console.log(`Successfully merged OpenAPI specs to ${mergedSpecPath}`);
}
catch (error) {
    console.error('Failed to write merged OpenAPI spec:', error.message);
    process.exit(1);
}

console.log('OpenAPI specification merge completed successfully!');