/**
 * Standalone tRPC server for Countly (POC)
 *
 * Run with:  node --experimental-strip-types trpc-server.ts
 *
 * Serves the tRPC API on port 3002 (configurable via TRPC_PORT env var).
 * The existing API on port 3001 stays untouched.
 */
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import cors from "cors";
import http from "http";
import { createRequire } from "module";
import { generateOpenApiDocument, createOpenApiHttpHandler } from "trpc-to-openapi";
import { appRouter } from "./trpc-app-router.ts";

export type { AppRouter } from "./trpc-app-router.ts";

// @ts-expect-error TS1470 - import.meta is valid at runtime
const require = createRequire(import.meta.url);

const plugins = require("./plugins/pluginManager.ts");
const common = require("./api/utils/common.js");
const QueryRunnerModule = require("./api/parts/data/QueryRunner.js");
const QueryRunner = QueryRunnerModule.default || QueryRunnerModule;
const { ReadBatcher } = require("./api/parts/data/batcher.js");

async function main() {
    // Connect to all databases (sets common.db, common.drillDb, etc.)
    await plugins.connectToAllDatabases();
    console.log("[trpc] Database connections established");

    // Initialize QueryRunner (needed by drill queries like getGraphValues)
    common.queryRunner = new QueryRunner();
    common.readBatcher = new ReadBatcher(common.db);
    if (common.drillDb) {
        common.drillReadBatcher = new ReadBatcher(common.drillDb, { configs_db: common.db });
    }

    // Load plugin configs
    await new Promise<void>((resolve) => {
        plugins.loadConfigs(common.db, () => resolve());
    });
    console.log("[trpc] Plugin configs loaded");

    const port = parseInt(process.env.TRPC_PORT || "3002", 10);

    // Generate OpenAPI document
    const openApiDocument = generateOpenApiDocument(appRouter as any, {
        title: "Countly tRPC API",
        description: "Countly analytics API powered by tRPC (POC)",
        version: "0.1.0",
        baseUrl: `http://localhost:${port}/api`,
        tags: ["Views"],
    });
    const openApiJson = JSON.stringify(openApiDocument, null, 2);

    const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Countly API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;

    const createContext = () => ({});

    // tRPC handler (native tRPC protocol)
    const trpcHandler = createHTTPHandler({
        middleware: cors(),
        router: appRouter,
        createContext,
    });

    // OpenAPI REST handler (translates REST requests → tRPC procedure calls)
    const openApiHandler = createOpenApiHttpHandler({
        router: appRouter as any,
        createContext,
    });

    // Route requests: /openapi.json → spec, /api/* → REST, everything else → tRPC
    const server = http.createServer((req, res) => {
        // CORS for all requests
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.url === "/openapi.json") {
            res.setHeader("Content-Type", "application/json");
            res.end(openApiJson);
            return;
        }

        if (req.url === "/docs" || req.url === "/docs/") {
            res.setHeader("Content-Type", "text/html");
            res.end(swaggerHtml);
            return;
        }

        // /api/* → OpenAPI REST handler (strip /api prefix)
        if (req.url?.startsWith("/api/") || req.url === "/api") {
            req.url = req.url.replace(/^\/api/, "") || "/";
            openApiHandler(req, res);
            return;
        }

        // Everything else → tRPC
        trpcHandler(req, res);
    });

    server.listen(port);
    console.log(`[trpc] Server listening on http://localhost:${port}`);
    console.log(`[trpc] OpenAPI spec at http://localhost:${port}/openapi.json`);
    console.log(`[trpc] Swagger UI at http://localhost:${port}/docs`);
}

main().catch((err) => {
    console.error("[trpc] Failed to start:", err);
    process.exit(1);
});
