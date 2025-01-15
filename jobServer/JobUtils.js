const Job = require('./Job');
const {isValidCron} = require('cron-validator');
const later = require('@breejs/later');
const crypto = require('crypto');

/**
 * Class responsible for validating job classes.
 */
class JobUtils {

    /**
     * Validates if a given job class is valid.
     * @param {Function} JobClass - The job class to validate.
     * @param {Function} [BaseClass=Job] - The base class that the job class should extend.
     * @returns {boolean} True if the job class is valid.
     * @throws {Error} If the job class is not a constructor or does not extend the base class.
     */
    static validateJobClass(JobClass, BaseClass = Job) {
        // Check if it's a class/constructor
        if (typeof JobClass !== 'function') {
            throw new Error('Job must be a class constructor');
        }

        // Check if it inherits from the base class
        if (!(JobClass.prototype instanceof BaseClass)) {
            throw new Error(`Job class must extend ${BaseClass.name}`);
        }

        // Additional checks can be added here
        return true;
    }

    /**
     * @note
     * We shouldn't need this and use cron string directly in job schedule to avoid conversion
     * Converts a later.js schedule to a cron string.
     * @param {String} laterString - The later.js schedule string.
     * @constructor
     * @retuns {String} The cron string.
     *
     * @note
     * TESTS NEEDED
     *
     * "every 5 minutes"
     * "at 01:01 am every 1 day"
     * "every seconds"
     * "at 3:00 am every 7 days"
     * "every 1 hour on the 1st min"
     * "every 1 day"
     * "every 1 day"
     * "every 1 hour starting on the 0 min"
     * "once in 2 hours"
     * "0 0 * * *"
     * "every 5 minutes"
     * "at 10:15 am every weekday"
     * "at 00:01 am every 1 day"
     * "every 1 day"
     * "every 1 day"
     * "every 1 day"
     * "every 1 day"
     * "every 5 minutes"
     * "every 10 minutes"
     * "every 1 minute"
     * "every 1 day"
     * "every 10 minutes"
     * "every 30 minutes"
     * "every 1 minutes"
     * "every 2 minutes"
     * "every 5 minutes"
     * "every 5 minute"
     * "every 1 hour"
     * "at 00:30 am every 1 day"
     * "every 5 minutes"
     * "every 12 hours"
     * "every 5 minutes"
     * "every 1 year"
     * "every 1 day"
     * "every 1 hour"
     * "at 03:25 am every 1 day"
     * "every 1 hour"
     * "every 5 minutes"
     */
    static LaterToCron(laterString) {
        // Handle direct cron expressions
        if (isValidCron(laterString)) {
            return laterString;
        }

        // Parse the schedule
        const schedule = later.parse.text(laterString);
        if (schedule.error !== -1) {
            throw new Error(`Invalid schedule string: ${laterString}`);
        }


        /**
         * Get the values of a component from the schedule
         * @param {Object} component - The component to extract values from.
         * @returns {any[]|*[]} The values of the component.
         */
        function getValues(component) {
            if (!schedule.schedules || schedule.schedules.length === 0) {
                return [];
            }
            const values = new Set();
            schedule.schedules.forEach(s => {
                if (s[component]) {
                    s[component].forEach(val => values.add(val));
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
            let [, hour, minute, meridiem] = isSpecificTime;
            hour = parseInt(hour, 10);
            minute = parseInt(minute, 10);
            if (meridiem) {
                hour = meridiem.toLowerCase() === 'pm' && hour < 12 ? hour + 12 : hour;
                hour = meridiem.toLowerCase() === 'am' && hour === 12 ? 0 : hour;
            }
            return `${minute} ${hour} * * *`;
        }

        if (isWeekday) {
            if (isSpecificTime) {
                let [, hour, minute, meridiem] = isSpecificTime;
                hour = parseInt(hour, 10);
                minute = parseInt(minute, 10);
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
                let [, hour, minute, meridiem] = isSpecificTime;
                hour = parseInt(hour, 10);
                minute = parseInt(minute, 10);
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
                let [, hour, minute, meridiem] = isSpecificTime;
                hour = parseInt(hour, 10);
                minute = parseInt(minute, 10);
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
         * @param {String} values - The values of the component.
         * @param {Number} total - The total number of possible
         * @returns {string|*} The formatted component.
         */
        function formatComponent(values, total) {
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

    /**
     * Calculates checksum for a job class
     * @param {Function} JobClass The job class to calculate checksum for
     * @returns {string} The calculated checksum
     */
    static calculateJobChecksum(JobClass) {
        const jobString = JobClass.toString();
        return crypto
            .createHash('sha256')
            .update(jobString)
            .digest('hex');
    }

}

module.exports = JobUtils;