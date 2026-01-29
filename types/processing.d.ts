/**
 * Type definitions for core data aggregators module
 * This module registers aggregator plugins and doesn't export any public API
 * @module api/aggregator/processing
 */

/**
 * Determines the type of a value for aggregation purposes
 * @param value - The value to determine the type of
 * @returns The determined type ('l' for list, 'a' for array, 'n' for number, 'd' for date)
 */
type ValueType = 'l' | 'a' | 'n' | 'd';

/**
 * Drill event structure from MongoDB change stream
 */
export interface DrillEvent {
    /** Internal document ID */
    __iid?: string;
    /** Creation date */
    cd?: Date;
    /** App ID */
    a: string;
    /** Event type */
    e: string;
    /** Event name (for custom events) */
    n?: string;
    /** Timestamp */
    ts: number;
    /** Count */
    c?: number;
    /** Sum */
    s?: number;
    /** Duration */
    dur?: number;
    /** Device ID */
    did?: string;
    /** Segmentation data */
    sg?: Record<string, unknown>;
    /** User properties */
    up?: Record<string, unknown>;
    /** Extra user properties (e.g., view count) */
    up_extra?: {
        vc?: number | string;
        [key: string]: unknown;
    };
    /** Custom properties */
    custom?: Record<string, unknown>;
    /** Campaign data */
    cmp?: Record<string, unknown>;
}

/**
 * Token from event source for tracking processing state
 */
export interface EventToken {
    /** Creation date marker */
    cd?: Date;
    /** Resume token */
    resumeToken?: unknown;
}

/**
 * Drill meta update structure
 */
export interface DrillMetaUpdate {
    /** Document ID */
    _id: string;
    /** App ID */
    app_id: string;
    /** Event name */
    e: string;
    /** Document type */
    type: string;
    /** Last timestamp */
    lts?: number;
    /** Segmentation types */
    [key: string]: unknown;
}

// This module is an IIFE that registers plugins and has no public exports
export {};
