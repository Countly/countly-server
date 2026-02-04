/**
 * This module defines default model to handle users collection data
 * @module "api/lib/countly.users"
 * @extends module:api/lib/countly.model~countlyMetric
 */

import type { CountlyMetric } from './countly.model.js';
import type { DataProperty } from '../../types/countly.common.js';

const countlyModel = require('./countly.model.js');
const countlyCommon = require('./countly.common.js');

/**
 * Options for getSubperiodData
 */
export interface SubperiodDataOptions {
    bucket?: 'monthly' | 'daily';
}

/**
 * Time data structure with total and prev-total
 */
export interface TimeData {
    total: number | string;
    'prev-total': number | string;
    change: string;
    trend: 'u' | 'd';
}

/**
 * Session data structure returned by getSessionData
 */
export interface SessionData {
    total_sessions: TimeData;
    new_users: TimeData;
    total_users: TimeData;
    total_time: TimeData;
    avg_time: TimeData;
    avg_requests: TimeData;
}

/**
 * Extended countly metric for users/sessions with additional methods
 */
export interface CountlyUsersMetric extends CountlyMetric {
    /**
     * Get main dashboard data, which is displayed on main dashboard
     * @returns dashboard data about users and sessions
     */
    getSessionData(): SessionData;

    /**
     * Get metric data by periods
     * @param options - options object (options.bucket - daily or monthly)
     * @returns array with metric data objects
     */
    getSubperiodData(options?: SubperiodDataOptions): Array<Record<string, unknown>>;
}

/**
 * Model creator
 * @returns new model
 */
function create(): CountlyUsersMetric {
    const countlySession = countlyModel.create() as CountlyUsersMetric;
    countlySession.setMetrics(['t', 'n', 'u', 'd', 'e', 'm', 'p']);
    countlySession.setUniqueMetrics(['u', 'm', 'p']);

    /**
     * Get main dashboard data, which is displayed on main dashboard
     * @returns dashboard data about users and sessions
     */
    countlySession.getSessionData = function(): SessionData {
        const map: Record<string, string> = {
            t: 'total_sessions',
            n: 'new_users',
            u: 'total_users',
            d: 'total_time',
            e: 'events'
        };
        const ret: Record<string, TimeData> = {};
        const data = countlyCommon.getDashboardData(
            countlySession.getDb(),
            ['t', 'n', 'u', 'd', 'e'],
            ['u'],
            { u: countlySession.getTotalUsersObj().users },
            { u: countlySession.getTotalUsersObj(true).users }
        );

        for (const i in data) {
            ret[map[i]] = data[i] as TimeData;
        }

        // convert duration to minutes
        (ret.total_time.total as number) /= 60;
        (ret.total_time['prev-total'] as number) /= 60;

        // calculate average duration
        const changeAvgDuration = countlyCommon.getPercentChange(
            (ret.total_sessions['prev-total'] as number === 0) ? 0 : (ret.total_time['prev-total'] as number) / (ret.total_sessions['prev-total'] as number),
            (ret.total_sessions.total as number === 0) ? 0 : (ret.total_time.total as number) / (ret.total_sessions.total as number)
        );
        ret.avg_time = {
            'prev-total': (ret.total_sessions['prev-total'] as number === 0) ? 0 : (ret.total_time['prev-total'] as number) / (ret.total_sessions['prev-total'] as number),
            'total': (ret.total_sessions.total as number === 0) ? 0 : (ret.total_time.total as number) / (ret.total_sessions.total as number),
            'change': changeAvgDuration.percent,
            'trend': changeAvgDuration.trend
        };

        ret.total_time.total = countlyCommon.timeString(ret.total_time.total as number);
        ret.total_time['prev-total'] = countlyCommon.timeString(ret.total_time['prev-total'] as number);
        ret.avg_time.total = countlyCommon.timeString(ret.avg_time.total as number);
        ret.avg_time['prev-total'] = countlyCommon.timeString(ret.avg_time['prev-total'] as number);

        // calculate average events
        const changeAvgEvents = countlyCommon.getPercentChange(
            (ret.total_users['prev-total'] as number === 0) ? 0 : (ret.events['prev-total'] as number) / (ret.total_users['prev-total'] as number),
            (ret.total_users.total as number === 0) ? 0 : (ret.events.total as number) / (ret.total_users.total as number)
        );
        ret.avg_requests = {
            'prev-total': (ret.total_users['prev-total'] as number === 0) ? 0 : (ret.events['prev-total'] as number) / (ret.total_users['prev-total'] as number),
            'total': (ret.total_users.total as number === 0) ? 0 : (ret.events.total as number) / (ret.total_users.total as number),
            'change': changeAvgEvents.percent,
            'trend': changeAvgEvents.trend
        };

        ret.avg_requests.total = (ret.avg_requests.total as number).toFixed(1);
        ret.avg_requests['prev-total'] = (ret.avg_requests['prev-total'] as number).toFixed(1);

        delete ret.events;

        // delete previous period data
        for (const i in ret) {
            delete (ret[i] as unknown as Record<string, unknown>)['prev-total'];
        }
        return ret as unknown as SessionData;
    };

    /**
     * Get metric data by periods
     * @param options - options object (options.bucket - daily or monthly)
     * @returns array with metric data objects
     */
    countlySession.getSubperiodData = function(options?: SubperiodDataOptions): Array<Record<string, unknown>> {
        const dataProps: DataProperty[] = [
            { name: 't' },
            { name: 'n' },
            { name: 'u' },
            { name: 'd' },
            { name: 'e' }
        ];
        options = options || {};
        return countlyCommon.extractData(countlySession.getDb(), countlySession.clearObject, dataProps, countlyCommon.calculatePeriodObject(null, options.bucket));
    };

    return countlySession;
}

export default create;
export { create };
