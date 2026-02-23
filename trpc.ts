import { initTRPC } from "@trpc/server";
import type { OpenApiMeta } from "trpc-to-openapi";

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.meta<OpenApiMeta>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;