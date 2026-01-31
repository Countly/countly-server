/**
 * Defines the priority levels for job processing
 * @readonly
 */

/**
 * Represents the available priority levels for jobs
 */
type PriorityLevel = 'lowest' | 'low' | 'normal' | 'high' | 'highest';

interface JobPrioritiesType {
    /**
     * Lowest priority - Use for background tasks that can be delayed
     */
    readonly LOWEST: PriorityLevel;

    /**
     * Low priority - Use for non-time-critical operations
     */
    readonly LOW: PriorityLevel;

    /**
     * Normal priority - Default priority level for most jobs
     */
    readonly NORMAL: PriorityLevel;

    /**
     * High priority - Use for time-sensitive operations
     */
    readonly HIGH: PriorityLevel;

    /**
     * Highest priority - Use for critical operations that need immediate processing
     */
    readonly HIGHEST: PriorityLevel;
}

const JOB_PRIORITIES: JobPrioritiesType = {
    LOWEST: 'lowest',
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    HIGHEST: 'highest'
} as const;

// Freeze the object to prevent modifications
Object.freeze(JOB_PRIORITIES);

export { JOB_PRIORITIES };
export type { PriorityLevel, JobPrioritiesType };
