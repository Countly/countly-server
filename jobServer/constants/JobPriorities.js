/**
 * Defines the priority levels for job processing
 * @readonly
 * @enum {PriorityLevel}
 */

/**
 * @typedef {'lowest' | 'low' | 'normal' | 'high' | 'highest'} PriorityLevel
 * @description Represents the available priority levels for jobs
 */

const JOB_PRIORITIES = {
    /** 
     * Lowest priority - Use for background tasks that can be delayed
     * @type {PriorityLevel}
     */
    LOWEST: 'lowest',

    /** 
     * Low priority - Use for non-time-critical operations
     * @type {PriorityLevel}
     */
    LOW: 'low',

    /** 
     * Normal priority - Default priority level for most jobs
     * @type {PriorityLevel}
     */
    NORMAL: 'normal',

    /** 
     * High priority - Use for time-sensitive operations
     * @type {PriorityLevel}
     */
    HIGH: 'high',

    /** 
     * Highest priority - Use for critical operations that need immediate processing
     * @type {PriorityLevel}
     */
    HIGHEST: 'highest'
};

// Freeze the object to prevent modifications
Object.freeze(JOB_PRIORITIES);

module.exports = {
    JOB_PRIORITIES
};