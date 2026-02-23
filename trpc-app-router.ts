/**
 * tRPC App Router — type-only definition.
 *
 * This file is intentionally free of runtime-only code (createRequire, etc.)
 * so that TypeScript can fully resolve the AppRouter type from any project
 * (e.g. the insight-architect frontend).
 *
 * At runtime, trpc-server.ts and api/api.js import the same pieces to
 * construct the actual router instance.
 */
import { router } from "./trpc.ts";
import { viewsRouter } from "./plugins/views/api/trpc.ts";

const appRouter = router({
    views: viewsRouter,
});

export type AppRouter = typeof appRouter;
export { appRouter };
