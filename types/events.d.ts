/**
 * Module that processes events for aggregated data
 */

import { Params } from "./requestProcessor";

/** Event collection document structure */
export interface EventCollection {
    _id: string;
    list?: string[];
    segments?: { [eventName: string]: { [segmentKey: string]: string[] } };
    omitted_segments?: { [eventName: string]: string[] };
    whitelisted_segments?: { [eventName: string]: string[] };
}

/** Event data structure */
export interface EventData {
    key: string;
    count?: number;
    sum?: number;
    dur?: number;
    segmentation?: { [key: string]: string | number | boolean };
    timestamp?: number;
    hour?: number;
    dow?: number;
    [key: string]: string | number | boolean | object | undefined;
}

/** Events module interface */
export interface EventsModule {
    /**
     * Process JSON decoded events data from request
     * @param params - Params object with request context
     * @returns Promise that resolves when processing is finished
     */
    processEvents(params: Params): Promise<void>;
}

declare const countlyEvents: EventsModule;
export default countlyEvents;