#!/usr/bin/env node

/**
 * This script generates HTML documentation using Swagger UI from the merged OpenAPI specification.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const outputDir = path.join(__dirname, '../../doc/api');
const mergedSpecPath = path.join(outputDir, 'openapi-merged.json');
const outputHtmlPath = path.join(outputDir, 'index.html');

// Ensure the merged spec exists
if (!fs.existsSync(mergedSpecPath)) {
    console.error(`Merged OpenAPI spec not found at ${mergedSpecPath}`);
    console.error('Please run merge-openapi.js first');
    process.exit(1);
}

console.log('Generating Swagger UI HTML documentation...');

// Create a simple HTML file with Swagger UI
const swaggerUiHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Countly API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <link rel="icon" type="image/png" href="https://countly.com/images/favicon.png" sizes="32x32" />
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #swagger-ui {
            max-width: 1460px;
            margin: 0 auto;
        }
        .topbar {
            background-color: #0166D6 !important;
            padding: 10px 0;
            text-align: center;
        }
        .topbar-wrapper img {
            content: url('https://countly.com/images/logo.svg');
            height: 40px;
        }
        .swagger-ui .info .title {
            color: #0166D6;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary {
            border-color: #0166D6;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
            background: #0166D6;
        }
        .swagger-ui .btn.execute {
            background-color: #0166D6;
            color: #fff;
            border-color: #0166D6;
        }
        .swagger-ui .btn.authorize {
            color: #0166D6;
            border-color: #0166D6;
        }
        .swagger-ui .opblock.opblock-post {
            background: rgba(1, 102, 214, 0.05);
            border-color: #0166D6;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: "./openapi-merged.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tagsSorter: 'alpha',
                docExpansion: 'list',
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                filter: true,
                supportedSubmitMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'],
                validatorUrl: null
            });
            window.ui = ui;
        };
    </script>
</body>
</html>
`;

try {
    fs.writeFileSync(outputHtmlPath, swaggerUiHtml);

    // Also create a copy with the swagger-ui-api.html name for backward compatibility
    fs.writeFileSync(path.join(outputDir, 'swagger-ui-api.html'), swaggerUiHtml);

    console.log(`Successfully generated Swagger UI documentation at ${outputHtmlPath}`);
    console.log(`Also created a copy at ${path.join(outputDir, 'swagger-ui-api.html')} for compatibility`);
}
catch (error) {
    console.error('Failed to generate Swagger UI documentation:', error.message);
    process.exit(1);
}

console.log('Swagger UI documentation generation completed successfully!');