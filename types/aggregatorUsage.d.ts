/**
 * Type definitions for aggregator usage module
 * Processes events and sessions from streams for aggregated data
 * @module api/aggregator/usage
 */

import { WriteBatcher } from './batcher';

/**
 * Event token for stream processing
 */
export interface StreamToken {
    /** Creation date marker */
    cd?: Date;
    /** Resume token */
    resumeToken?: unknown;
}

/**
 * Parameters for aggregator processing
 */
export interface AggregatorParams {
    /** App ID */
    app_id: string;
    /** App document */
    app?: {
        timezone?: string;
        plugins?: Record<string, unknown>;
    };
    /** App timezone */
    appTimezone: string;
    /** Time object */
    time: {
        timestamp?: number;
        mstimestamp?: number;
        yearly?: string | number;
        monthly?: string;
        month?: string;
        weekly?: number;
        daily?: string;
        day?: string | number;
        hour?: string | number;
    };
    /** App user document */
    app_user?: Record<string, unknown>;
}

/**
 * Event from aggregation batch
 */
export interface AggregatedEvent {
    /** App ID */
    a: string;
    /** Event type */
    e: string;
    /** Event name */
    n?: string;
    /** Hour string (YYYY:MM:DD:HH) */
    h: string;
    /** Count */
    c?: number;
    /** Sum */
    s?: number;
    /** Duration */
    dur?: number;
}

/**
 * Stream event structure
 */
export interface StreamEvent {
    /** App ID */
    a: string;
    /** Event type */
    e: string;
    /** Event name (for custom events) */
    n?: string;
    /** Timestamp (milliseconds) */
    ts: number;
    /** Hour string (calculated) */
    h?: string;
    /** Count */
    c?: number;
    /** Sum */
    s?: number;
    /** Duration */
    dur?: number;
    /** Device ID */
    did?: string;
    /** Segmentation data */
    sg?: Record<string, unknown> & {
        prev_session?: boolean;
        prev_start?: number;
    };
    /** User properties */
    up?: Record<string, unknown> & {
        cc?: string;
    };
    /** Extra update properties */
    up_extra?: {
        vc?: number | string;
    };
}

/**
 * Predefined metric definition
 */
export interface MetricDefinition {
    /** Metric name (e.g., "_carrier", "_device") */
    name: string;
    /** Set name for storage */
    set: string;
    /** Short code for user document */
    short_code: string;
    /** Whether this is a user property */
    is_user_prop?: boolean;
    /** Whether to track changes */
    track_changes?: boolean;
    /** Custom function to get metric value */
    getMetricValue?: (doc: StreamEvent) => string | number | undefined;
}

/**
 * Predefined metrics group
 */
export interface PredefinedMetricsGroup {
    /** Database collection name */
    db: string;
    /** Array of metric definitions */
    metrics: MetricDefinition[];
}

/**
 * User properties object
 */
export interface UserProperties {
    [key: string]: string | number | boolean | object;
}

/**
 * Aggregator usage module interface
 */
export interface AggregatorUsageModule {
    /**
     * Process view count range for session
     * @param writeBatcher - Write batcher instance
     * @param token - Stream token
     * @param vc - View count
     * @param did - Device ID
     * @param params - Aggregator parameters
     */
    processViewCount(
        writeBatcher: WriteBatcher,
        token: StreamToken,
        vc: number | string | undefined,
        did: string,
        params: AggregatorParams
    ): Promise<void>;

    /**
     * Process session duration range
     * @param writeBatcher - Write batcher instance
     * @param token - Stream token
     * @param totalSessionDuration - Total session duration in seconds
     * @param did - Device ID
     * @param params - Aggregator parameters
     */
    processSessionDurationRange(
        writeBatcher: WriteBatcher,
        token: StreamToken,
        totalSessionDuration: number,
        did: string,
        params: AggregatorParams
    ): Promise<void>;

    /**
     * Process session data from stream
     * @param token - Stream token
     * @param currEvent - Current session event
     * @param params - Aggregator parameters
     */
    processSessionFromStream(
        token: StreamToken,
        currEvent: StreamEvent,
        params: AggregatorParams
    ): Promise<void>;

    /**
     * Process event totals from aggregation batch
     * @param token - Stream token
     * @param currEventArray - Array of aggregated events
     * @param writeBatcher - Write batcher instance
     */
    processEventTotalsFromAggregation(
        token: StreamToken,
        currEventArray: AggregatedEvent[],
        writeBatcher: WriteBatcher
    ): Promise<void>;

    /**
     * Process event totals from stream
     * @param token - Stream token
     * @param currEvent - Current event
     * @param writeBatcher - Write batcher instance
     */
    processEventTotalsFromStream(
        token: StreamToken,
        currEvent: StreamEvent,
        writeBatcher: WriteBatcher
    ): Promise<void>;

    /**
     * Process individual event from stream
     * @param token - Stream token
     * @param currEvent - Current event
     * @param writeBatcher - Write batcher instance (optional)
     */
    processEventFromStream(
        token: StreamToken,
        currEvent: StreamEvent,
        writeBatcher?: WriteBatcher
    ): void;

    /**
     * Process session metrics from stream
     * @param currEvent - Current session event
     * @param uniqueLevelsZero - Unique levels for zero document
     * @param uniqueLevelsMonth - Unique levels for month document
     * @param params - Aggregator parameters
     */
    processSessionMetricsFromStream(
        currEvent: StreamEvent,
        uniqueLevelsZero: string[],
        uniqueLevelsMonth: string[],
        params: AggregatorParams
    ): void;

    /**
     * Get predefined metrics for user
     * @param params - Aggregator parameters
     * @param userProps - User properties object
     * @returns Array of predefined metrics groups
     */
    getPredefinedMetrics(
        params: AggregatorParams,
        userProps: UserProperties
    ): PredefinedMetricsGroup[];
}

declare const usage: AggregatorUsageModule;
export default usage;
