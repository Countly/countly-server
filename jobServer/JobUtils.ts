/**
 * Utility class for job validation and scheduling
 * @module jobServer/JobUtils
 */

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const Job = require('./Job');
const { isValidCron } = require('cron-validator');
const later = require('@breejs/later');
const crypto = require('crypto');

/**
 * Job class constructor type
 */
type JobClassConstructor = new (...args: unknown[]) => typeof Job;

/**
 * Later.js schedule object
 */
interface LaterSchedule {
    schedules?: Array<{
        m?: number[];
        h?: number[];
        D?: number[];
        M?: number[];
        d?: number[];
        [key: string]: number[] | undefined;
    }>;
    error: number;
}

/**
 * Class responsible for validating job classes.
 */
class JobUtils {
    /**
     * Validates if a given job class is valid.
     * @param JobClass - The job class to validate.
     * @param BaseClass - The base class that the job class should extend.
     * @returns True if the job class is valid.
     * @throws Error if the job class is not a constructor or does not extend the base class.
     */
    static validateJobClass(JobClass: JobClassConstructor, BaseClass: JobClassConstructor = Job): boolean {
        // Check if it's a class/constructor
        if (typeof JobClass !== 'function') {
            throw new Error('Job must be a class constructor');
        }

        // Check if it inherits from the base class
        if (!(JobClass.prototype instanceof BaseClass)) {
            throw new Error(`Job class must extend ${BaseClass.name}`);
        }

        // Check if required methods are overridden
        const requiredMethods = ['run', 'getSchedule'];
        for (const method of requiredMethods) {
            // Get the method from the job class prototype
            const jobMethod = JobClass.prototype[method];
            // Get the method from the base class prototype
            const baseMethod = BaseClass.prototype[method];

            // Check if method exists and is different from base class implementation
            if (!jobMethod || jobMethod === baseMethod) {
                throw new Error(`Job class must override the '${method}' method`);
            }
        }

        return true;
    }

    /**
     * Calculates checksum for a job class
     * @param JobClass - The job class to calculate checksum for
     * @returns The calculated checksum
     */
    static calculateJobChecksum(JobClass: JobClassConstructor): string {
        const jobString = JobClass.toString();
        return crypto
            .createHash('sha256')
            .update(jobString)
            .digest('hex');
    }

    /**
     * Converts a later.js schedule string to a cron string.
     * @param laterString - The later.js schedule string.
     * @returns The cron string.
     * @throws Error if the schedule string is invalid.
     *
     * @note
     * We shouldn't need this and use cron string directly in job schedule to avoid conversion.
     * If we do decide to use this, we need to add tests for all the possible cron strings currently used in countly.
     */
    static LaterToCron(laterString: string): string {
        // Handle direct cron expressions
        if (isValidCron(laterString)) {
            return laterString;
        }

        // Parse the schedule
        const schedule: LaterSchedule = later.parse.text(laterString);
        if (schedule.error !== -1) {
            throw new Error(`Invalid schedule string: ${laterString}`);
        }

        /**
         * Get the values of a component from the schedule
         * @param component - The component to extract values from.
         * @returns The values of the component.
         */
        function getValues(component: string): number[] {
            if (!schedule.schedules || schedule.schedules.length === 0) {
                return [];
            }
            const values = new Set<number>();
            schedule.schedules.forEach(s => {
                if (s[component]) {
                    s[component]!.forEach(val => values.add(val));
                }
            });
            return Array.from(values).sort((a, b) => a - b);
        }

        // Extract schedule components
        const minutes = getValues('m');
        const hours = getValues('h');
        const daysOfMonth = getValues('D');
        const months = getValues('M');
        const daysOfWeek = getValues('d');

        // Common pattern detection
        const isEveryMinute = laterString.match(/every\s+(\d+)\s*minute/);
        const isEveryHour = laterString.match(/every\s+(\d+)\s*hour/);
        const isSpecificTime = laterString.match(/at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        const isEveryDay = laterString.includes('every 1 day') || laterString.includes('every day');
        const isEveryYear = laterString.includes('every 1 year') || laterString.includes('yearly');
        const isWeekday = laterString.toLowerCase().includes('weekday');
        const isEveryNDays = laterString.match(/every\s+(\d+)\s+days?/);
        const isLastDayOfMonth = laterString.includes("last day of the month");
        const isOnceInHours = laterString.match(/once in (\d+) hours?/);

        // Handle specific patterns
        if (isEveryYear) {
            return '0 0 1 1 *'; // Midnight on January 1st
        }

        if (isEveryMinute) {
            const interval = parseInt(isEveryMinute[1], 10);
            return `*/${interval} * * * *`;
        }

        if (isEveryHour) {
            const interval = parseInt(isEveryHour[1], 10);
            return laterString.includes('on the 1st min')
                ? `1 */${interval} * * *`
                : `0 */${interval} * * *`;
        }

        if (isSpecificTime && isEveryDay) {
            let [, hourStr, minuteStr, meridiem] = isSpecificTime;
            let hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);
            if (meridiem) {
                hour = meridiem.toLowerCase() === 'pm' && hour < 12 ? hour + 12 : hour;
                hour = meridiem.toLowerCase() === 'am' && hour === 12 ? 0 : hour;
            }
            return `${minute} ${hour} * * *`;
        }

        if (isWeekday) {
            if (isSpecificTime) {
                let [, hourStr, minuteStr, meridiem] = isSpecificTime;
                let hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);
                if (meridiem) {
                    hour = meridiem.toLowerCase() === 'pm' && hour < 12 ? hour + 12 : hour;
                    hour = meridiem.toLowerCase() === 'am' && hour === 12 ? 0 : hour;
                }
                return `${minute} ${hour} * * 1-5`;
            }
            return '0 0 * * 1-5';
        }

        if (isEveryNDays) {
            const interval = parseInt(isEveryNDays[1], 10);
            if (isSpecificTime) {
                let [, hourStr, minuteStr, meridiem] = isSpecificTime;
                let hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);
                if (meridiem) {
                    hour = meridiem.toLowerCase() === 'pm' && hour < 12 ? hour + 12 : hour;
                    hour = meridiem.toLowerCase() === 'am' && hour === 12 ? 0 : hour;
                }
                return `${minute} ${hour} */${interval} * *`;
            }
            return `0 0 */${interval} * *`;
        }

        if (isLastDayOfMonth) {
            if (isSpecificTime) {
                let [, hourStr, minuteStr, meridiem] = isSpecificTime;
                let hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);
                if (meridiem) {
                    hour = meridiem.toLowerCase() === 'pm' && hour < 12 ? hour + 12 : hour;
                    hour = meridiem.toLowerCase() === 'am' && hour === 12 ? 0 : hour;
                }
                return `${minute} ${hour} L * *`;
            }
            return `0 0 L * *`;
        }

        if (isOnceInHours) {
            const interval = parseInt(isOnceInHours[1], 10);
            return `0 */${interval} * * *`;
        }

        /**
         * Formats a component of the cron string.
         * @param values - The values of the component.
         * @param total - The total number of possible values.
         * @returns The formatted component.
         */
        function formatComponent(values: number[], total: number): string | number {
            if (values.length === 0) {
                return '*';
            }
            if (values.length === 1) {
                return values[0];
            }
            if (values.length === total) {
                return '*';
            }

            const interval = values.length > 1 && values[1] - values[0];
            const isInterval = values.every((v, i) => i === 0 || v - values[i - 1] === interval);
            return isInterval ? `*/${interval}` : values.join(',');
        }

        const minutePart = formatComponent(minutes, 60);
        const hourPart = formatComponent(hours, 24);
        const dayPart = formatComponent(daysOfMonth, 31);
        const monthPart = formatComponent(months, 12);
        const dayOfWeekPart = formatComponent(daysOfWeek, 7);

        return `${minutePart} ${hourPart} ${dayPart} ${monthPart} ${dayOfWeekPart}`;
    }
}

export default JobUtils;
export { JobUtils };
