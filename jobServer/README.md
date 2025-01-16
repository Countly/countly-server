# Job Server Module

A flexible, extensible job scheduling and execution system built on MongoDB with support for multiple runner implementations.

## Table of Contents

1. [Overview](#overview)
2. [Dependencies](#dependencies)
3. [Installation](#installation)
4. [Collections](#collections)
5. [Basic Usage](#basic-usage)
6. [Architecture](#architecture)
7. [Design Patterns](#design-patterns)
8. [Server Configuration](#server-configuration)
9. [Job Implementation Guide](#job-implementation-guide)
10. [Lock Extension & Progress Reporting](#lock-extension--progress-reporting)
11. [Job Configuration Management](#job-configuration-management)
12. [Parallel Processing](#parallel-processing)
13. [File Structure](#file-structure)
14. [Interface Contracts](#interface-contracts)
15. [Implementing New Runners](#implementing-new-runners)
16. [Error Handling & Monitoring](#error-handling--monitoring)
17. [Best Practices](#best-practices)
18. [Troubleshooting Guide](#troubleshooting-guide)
19. [Monitoring & Metrics](#monitoring--metrics)
20. [BullMQ Implementation Guide](#bullmq-implementation-guide)

## Overview

The Job Server Module provides a robust framework for scheduling and executing background jobs in a distributed environment. Built with extensibility in mind, it currently supports Pulse (MongoDB-based) as the default runner, with capability to add other runners like BullMQ.

### Key Features:

- Flexible job scheduling (cron, one-time, immediate)
- Job progress tracking
- Automatic retries with exponential backoff
- Priority-based execution
- Concurrent job execution control
- Dynamic configuration updates
- Distributed execution across multiple processes
- Extensible runner architecture

## Dependencies

Core dependencies:
```json
{
  "@pulsecron/pulse": "1.6.7",
  "cron-validator": "^1.3.1",
  "@breejs/later": "^4.2.0", // should be removed soon
  "mongodb": "6.11.0"
}
```

## Installation

1. Install dependencies:
```bash
npm install @pulsecron/pulse cron-validator @breejs/later mongodb
```

2. Set up MongoDB connection:
```javascript
const { MongoClient } = require('mongodb');
const client = await MongoClient.connect('mongodb://localhost:27017');
const db = client.db('your_database');
```

## Collections

The module uses two MongoDB collections:

1. `pulseJobs` (configurable name)
   - Stores job definitions and execution state
   - Managed by Pulse runner
   - Schema includes job name, schedule, status, locks, etc.

2. `jobConfigs`
   - Stores job configuration overrides
   - Used for dynamic configuration management
   - Schema:
     ```javascript
     {
       jobName: String,          // Unique job identifier
       enabled: Boolean,         // Job enabled state
       checksum: String,        // Job implementation checksum
       schedule: Object,        // Schedule override
       retry: Object,          // Retry configuration
       runNow: Boolean,        // Trigger immediate execution
       createdAt: Date,
       updatedAt: Date,
       defaultConfig: Object   // Original job configuration
     }
     ```

## Basic Usage

1. Create a job server instance:
```javascript
const JobServer = require('./JobServer');
const server = await JobServer.create(common, Logger, pluginManager);
```

2. Start the server:
```javascript
await server.start();
```

3. Handle graceful shutdown:
```javascript
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());
```

## Architecture

### Dependency Flow

```
JobServer
    |
    +------------------+------------------+
    |                  |                  |
JobScanner         JobManager      Signal Handlers
    |                  |
    |          +------+------+
    |          |      |      |
Plugin System  Jobs JobRunner Config
    |                  |
    |          +------+------+
    |          |      |      |
JobExecutor JobScheduler JobLifecycle
    |          |      |
    +----------+------+
              |
         Runner Impl
    (Pulse/BullMQ/etc)
```

### Core Components Flow

```
[Job Files] -> [JobScanner] -> [JobManager] -> [JobRunner] -> [Database]
    ^            |               |               |
    |            v               v               v
[Plugin Jobs] [Configuration] [Execution]    [Storage]
```

### Component Roles

1. **JobServer**
   - Entry point and orchestrator
   - Manages lifecycle of all components
   - Handles process signals and shutdown

2. **JobScanner**
   - Discovers job files in project and plugins
   - Validates job implementations
   - Tracks job file changes

3. **JobManager**
   - Manages job configurations
   - Handles dynamic updates
   - Coordinates with runner implementation

4. **JobRunner**
   - Abstract interface for runner implementations
   - Provides common job operations
   - Delegates to specific implementations

5. **Runner Implementation**
   - Concrete implementation (e.g., Pulse)
   - Handles actual job execution
   - Manages scheduling and state

## Design Patterns

The Job Server Module employs several design patterns to maintain flexibility, testability, and extensibility:

### Core Patterns

1. **Interface Segregation**
   - Job operations split into focused interfaces (IJobExecutor, IJobScheduler, IJobLifecycle)
   - Enables targeted implementation of specific job aspects
   - Reduces coupling between components
   ```javascript
   // Example: Separate interfaces for different concerns
   interface IJobExecutor { /* job execution methods */ }
   interface IJobScheduler { /* scheduling methods */ }
   interface IJobLifecycle { /* lifecycle methods */ }
   ```

2. **Composition over Inheritance**
   - BaseJobRunner composes functionality from specialized interfaces
   - Runner implementations combine executor, scheduler, and lifecycle components
   - Allows flexible mixing of different implementations
   ```javascript
   class BaseJobRunner {
       constructor(scheduler, executor, lifecycle) {
           this.scheduler = scheduler;
           this.executor = executor;
           this.lifecycle = lifecycle;
       }
   }
   ```

3. **Dependency Injection**
   - Components receive dependencies through constructors
   - Facilitates testing and configuration
   - Enables runtime selection of implementations
   ```javascript
   const server = await JobServer.create(common, Logger, pluginManager, {
       runner: {
           type: 'pulse',
           config: { /* ... */ }
       }
   });
   ```

4. **Factory Pattern**
   - Runner implementations created through factory methods
   - Centralizes runner instantiation logic
   - Supports multiple runner types (Pulse, BullMQ)
   ```javascript
   // Example: Runner factory
   const RUNNER_TYPES = {
       PULSE: 'pulse',
       BULL: 'bullmq'
   };
   ```


### Benefits

- **Extensibility**: New runners can be added without modifying existing code
- **Testability**: Components can be tested in isolation with mock implementations
- **Flexibility**: Runtime configuration of job processing behavior
- **Maintainability**: Clear separation of concerns and modular design

## Server Configuration

### Pulse Runner Configuration

```javascript
const DEFAULT_PULSE_CONFIG = {
    processEvery: '3 seconds',     // Job check frequency
    maxConcurrency: 1,             // Max concurrent jobs
    defaultConcurrency: 1,         // Default concurrent jobs per type
    lockLimit: 1,                  // Max locked jobs
    defaultLockLimit: 1,           // Default locked jobs per type
    defaultLockLifetime: 55 * 60 * 1000,  // Lock timeout (55 mins)
    sort: { nextRunAt: 1, priority: -1 },
    db: {
        collection: 'pulseJobs',   // Collection name
    }
};
```

### Process-Level Configuration

```javascript
const server = await JobServer.create(common, Logger, pluginManager, {
    runner: {
        type: 'pulse',
        config: {
            maxConcurrency: 5,
            processEvery: '5 seconds',
            defaultLockLifetime: 30 * 60 * 1000
        }
    },
    scanner: {
        watchEnabled: true,
        scanInterval: 60000
    }
});
```

## Job Implementation Guide

### Basic Job Structure

```javascript
const { Job } = require('./jobServer');

class MyJob extends Job {
    // Required: Define schedule
    getSchedule() {
        return {
            type: 'schedule',
            value: '0 * * * *'  // Run hourly
        };
    }

    // Required: Implement job logic
    async run(db, done, progress) {
        try {
            // Your job logic here
            await progress(100, 50, 'Processing...');
            done(null, { success: true });
        }
        catch (error) {
            done(error);
        }
    }

    // Optional: Configure retries
    getRetryConfig() {
        return {
            enabled: true,
            attempts: 3,
            delay: 60000  // 1 minute
        };
    }

    // Optional: Set priority
    getPriority() {
        return this.priorities.HIGH;
    }

    // Optional: Set concurrency
    getConcurrency() {
        return 2;
    }
}
```

### Long-Running Job Example

```javascript
class DataProcessingJob extends Job {
    getSchedule() {
        return {
            type: 'schedule',
            value: '0 0 * * *'  // Daily at midnight
        };
    }

    async run(db, done, progress) {
        try {
            const total = await db.collection('data').countDocuments();
            let processed = 0;

            // Process in batches
            for (let i = 0; i < total; i += 100) {
                const batch = await db.collection('data')
                    .find()
                    .skip(i)
                    .limit(100)
                    .toArray();

                await this.processBatch(batch);
                processed += batch.length;

                // Report progress
                await progress(
                    total,
                    processed,
                    `Processed ${processed} of ${total} records`
                );

                // Extend lock if needed
                await this.touch();
            }

            done(null, { processed });
        }
        catch (error) {
            done(error);
        }
    }

    getLockLifetime() {
        return 2 * 60 * 60 * 1000; // 2 hours
    }
}
```

## Lock Extension & Progress Reporting

### Lock Extension
Long-running jobs need to periodically extend their locks to prevent expiration and avoid duplicate execution. The job system provides two ways to extend locks:

1. **Automatic Extension with Progress Updates**
   When using the progress reporting function, locks are automatically extended:

```javascript
class MyLongJob extends Job {
    async run(db, done, progress) {
        const total = 1000;
        for (let i = 0; i < total; i++) {
            // Process item...
            
            // Automatically extends lock when reporting progress
            await progress(
                total,
                i + 1,
                `Processing item ${i + 1}/${total}`
            );
        }
        done();
    }
}
```

## Job Configuration Management

### Dynamic Configuration via MongoDB

Jobs can be configured dynamically by modifying the `jobConfigs` collection. The server watches for changes and applies them in real-time.

### Configuration Operations

1. **Enable/Disable Job**
```javascript
await db.collection('jobConfigs').updateOne(
    { jobName: 'api:myJob' },
    { $set: { enabled: false } }
);
```

2. **Update Schedule**
```javascript
await db.collection('jobConfigs').updateOne(
    { jobName: 'api:myJob' },
    {
        $set: {
            schedule: {
                type: 'schedule',
                value: '*/30 * * * *'  // Every 30 minutes
            }
        }
    }
);
```

3. **Modify Retry Settings**
```javascript
await db.collection('jobConfigs').updateOne(
    { jobName: 'api:myJob' },
    {
        $set: {
            retry: {
                enabled: true,
                attempts: 5,
                delay: 120000  // 2 minutes
            }
        }
    }
);
```

4. **Trigger Immediate Execution**
```javascript
await db.collection('jobConfigs').updateOne(
    { jobName: 'api:myJob' },
    { $set: { runNow: true } }
);
```

### Configuration Lifecycle

1. **Initial Configuration**
   - Created when job is first discovered
   - Contains default values from job implementation
   - Stores implementation checksum

2. **Configuration Updates**
   - Applied immediately to running jobs
   - Persisted across server restarts
   - Validated against job interface

3. **Implementation Changes**
   - Detected via checksum comparison
   - Triggers configuration reset
   - Maintains enabled/disabled state

## Parallel Processing

### Process-Level Parallelism

Multiple job server processes can run simultaneously, coordinating through MongoDB:

1. **Process Configuration**
```javascript
node index.js
```

All the running processes will look at the jobs collection and start processing the next available job based on
* runtime
* lock status
* priority

2. **Lock-Based Coordination**
   - Jobs are locked when claimed by a process
   - Locks expire after `lockLifetime`
   - Failed processes release locks automatically

### Job-Level Concurrency

Control parallel execution at the job level:

1. **Global Settings**
```javascript
const config = {
    maxConcurrency: 5,      // Process-wide limit
    defaultConcurrency: 1,  // Default per job
    lockLimit: 3,          // Max locks per process
};
```

2. **Per-Job Settings**
```javascript
class MyJob extends Job {
    getConcurrency() {
        return 2;  // Allow 2 concurrent instances
    }

    getLockLifetime() {
        return 30 * 60 * 1000;  // 30 minute lock
    }
}
```

3. **Dynamic Adjustment**
```javascript
await db.collection('jobConfigs').updateOne(
    { jobName: 'api:myJob' },
    {
        $set: {
            concurrency: 3,
            lockLifetime: 45 * 60 * 1000
        }
    }
);
```

### Load Distribution

Jobs are distributed across processes based on:

1. **Priority**
   - Higher priority jobs run first
   - Configurable via `getPriority()`

2. **Process Capacity**
   - Respects `maxConcurrency` limits
   - Considers current load

3. **Lock Management**
   - Prevents duplicate execution
   - Handles failed processes
   - Supports job recovery

## File Structure

```
jobServer/
├── constants/
│   └── JobPriorities.js       # Priority level definitions
├── jobRunner/
│   ├── interfaces/            # Core interfaces
│   │   ├── IJobExecutor.js
│   │   ├── IJobLifecycle.js
│   │   └── IJobScheduler.js
│   ├── impl/                  # Runner implementations
│   │   ├── pulse/            # Pulse runner
│   │   │   ├── PulseJobExecutor.js
│   │   │   ├── PulseJobLifecycle.js
│   │   │   └── PulseJobScheduler.js
│   │   └── bullmq/          # Future BullMQ implementation
│   ├── BaseJobRunner.js      # Abstract runner base
│   ├── PulseJobRunner.js     # Pulse runner composition
│   └── index.js             # Runner factory
├── Job.js                    # Base job class
├── JobManager.js            # Job management
├── JobScanner.js           # Job discovery
├── JobServer.js            # Main entry point
├── JobUtils.js             # Utility functions
└── config.js               # Default configurations
```

## Interface Contracts

### IJobExecutor

Handles job creation and execution control:

```javascript
class IJobExecutor {
    async createJob(jobName, JobClass) {}
    async enableJob(jobName) {}
    async disableJob(jobName) {}
    async configureRetry(jobName, retryConfig) {}
}
```

### IJobScheduler

Manages job scheduling and timing:

```javascript
class IJobScheduler {
    async schedule(name, scheduleConfig, data) {}
    async updateSchedule(jobName, schedule) {}
    async runJobNow(jobName) {}
}
```

### IJobLifecycle

Controls runner lifecycle:

```javascript
class IJobLifecycle {
    async start(jobClasses) {}
    async close() {}
}
```

## Implementing New Runners

### Runner Implementation Steps

1. **Create Implementation Directory**
```bash
mkdir -p jobRunner/impl/myRunner
```

2. **Implement Required Classes**
   - MyJobExecutor extends IJobExecutor
   - MyJobScheduler extends IJobScheduler
   - MyJobLifecycle extends IJobLifecycle

3. **Create Runner Class**
```javascript
class MyJobRunner extends BaseJobRunner {
    constructor(db, config, Logger) {
        const executor = new MyJobExecutor(/* ... */);
        const scheduler = new MyJobScheduler(/* ... */);
        const lifecycle = new MyJobLifecycle(/* ... */);
        super(scheduler, executor, lifecycle);
    }
}
```

4. **Register Runner Type**
```javascript
// jobRunner/index.js
const RUNNER_TYPES = {
    PULSE: 'pulse',
    MY_RUNNER: 'myRunner'
};
```

## Error Handling & Monitoring

### Job Error Handling

1. **Error Types**
```javascript
class MyJob extends Job {
    async run(db, done, progress) {
        try {
            // Transient errors (will retry)
            throw new RetryableError('Database timeout');
            
            // Fatal errors (won't retry)
            throw new FatalError('Invalid configuration');
            
            // Unknown errors (will retry based on config)
            throw new Error('Unexpected error');
        }
        catch (error) {
            done(error);
        }
    }
}
```

2. **Retry Configuration**
```javascript
{
    retry: {
        enabled: true,
        attempts: 3,
        delay: 60000,
        backoff: {
            type: 'exponential',
            factor: 2
        },
    }
}
```

### Job Progress Monitoring

1. **Progress Updates**
```javascript
await progress(
    totalItems,      // Total items to process
    processedItems,  // Items processed so far
    'Processing batch 3/10', // Status message
);
```

2. **Job Status Queries**
```javascript
const jobStatus = await db.collection('pulseJobs').findOne(
    { name: 'api:myJob' },
    { 
        projection: { 
            status: 1,
            progress: 1,
            lastRunAt: 1,
            nextRunAt: 1,
            failCount: 1,
            lastError: 1
        } 
    }
);
```

## Best Practices

### Job Implementation

1. **Idempotency**
```javascript
class IdempotentJob extends Job {
    async run(db, done) {
        const operationId = 'batch_20240101';
        
        // Check if already processed
        const existing = await db.collection('processed')
            .findOne({ operationId });
            
        if (existing) {
            return done(null, { skipped: true });
        }
        
        // Process and mark as done
        await db.collection('processed')
            .insertOne({ 
                operationId,
                processedAt: new Date()
            });
    }
}
```

2. **Resource Management**
```javascript
class ResourceEfficientJob extends Job {
    async run(db, done) {
        const cursor = db.collection('large_data')
            .find()
            .batchSize(1000);
            
        try {
            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                await this.processDocument(doc);
            }
        }
        finally {
            await cursor.close();
        }
    }
}
```

## Troubleshooting Guide

### Common Issues

1. **Job Not Running**
   - Check job configuration in `jobConfigs` collection
   - Verify schedule configuration
   - Check if job is enabled
   - Look for lock conflicts

2. **Job Failing**
   - Check error messages in job document
   - Verify retry configuration
   - Check resource availability
   - Monitor lock timeouts

3. **Performance Issues**
   - Review concurrency settings
   - Check database indexes
   - Monitor memory usage
   - Optimize batch sizes

### Debugging Tools

1. **Job Status Check**
```javascript
const status = await db.collection('pulseJobs')
    .find(
        { name: 'api:myJob' },
        { 
            sort: { lastRunAt: -1 },
            limit: 1
        }
    ).toArray();
```

2. **Lock Investigation**
```javascript
const locks = await db.collection('pulseJobs')
    .find({
        lockedAt: { $exists: true },
        lastRunAt: { 
            $lt: new Date(Date.now() - 30 * 60 * 1000)
        }
    }).toArray();
```

3. **Configuration Validation**
```javascript
const config = await db.collection('jobConfigs')
    .findOne({ jobName: 'api:myJob' });

const isValid = JobUtils.validateConfig(config);
```

## Monitoring & Metrics

### System Health Metrics

1. **Job Statistics**
```javascript
const stats = await db.collection('pulseJobs').aggregate([
    {
        $group: {
            _id: '$name',
            totalRuns: { $sum: 1 },
            failures: { $sum: { $cond: ['$failedAt', 1, 0] } },
            avgDuration: { $avg: '$duration' },
            lastRun: { $max: '$lastRunAt' }
        }
    }
]).toArray();
```

2. **Process Metrics**
```javascript
const metrics = {
    activeJobs: await db.collection('pulseJobs').countDocuments({ 
        lockedAt: { $exists: true } 
    }),
    pendingJobs: await db.collection('pulseJobs').countDocuments({ 
        nextRunAt: { $lte: new Date() },
        lockedAt: { $exists: false }
    }),
    failedJobs: await db.collection('pulseJobs').countDocuments({ 
        failedAt: { $exists: true } 
    })
};
```

### Health Checks

1. **Lock Health**
```javascript
const staleLocks = await db.collection('pulseJobs').find({
    lockedAt: { 
        $lt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour
    }
}).toArray();

if (staleLocks.length > 0) {
    // Alert: Stale locks detected
}
```

### Alerting Integration

### Logging Best Practices

1. **Structured Logging**
```javascript
class LoggingJob extends Job {
    async run(db, done) {
        this.logger.i('Starting job', {
            job: this.jobName,
            timestamp: new Date(),
            params: this.params
        });

        // Job logic

        this.logger.i('Job completed', {
            job: this.jobName,
            duration: Date.now() - startTime,
            result: result
        });
    }
}
```

2. **Log Levels**
```javascript
{
    d: 'Detailed debugging information',
    i: 'General operational information',
    w: 'Warning messages for potentially harmful situations',
    e: 'Error events that might still allow the application to continue running'
}
```

## BullMQ Implementation Guide

### Setup Requirements

1. **Redis Connection**
```javascript
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
    host: 'localhost',
    port: 6379
});
```

2. **Basic Structure**
```jobRunner/impl/bullmq/
├── BullMQJobExecutor.js
├── BullMQJobLifecycle.js
├── BullMQJobScheduler.js
└── BullMQJobRunner.js
```

### Implementation Strategy

1. **Queue Management**
```javascript
class BullMQJobExecutor extends IJobExecutor {
    constructor() {
        this.queues = new Map();
        this.workers = new Map();
    }

    async createJob(jobName, JobClass) {
        const queue = new Queue(jobName, { connection });
        const worker = new Worker(jobName, async job => {
            const instance = new JobClass();
            return instance.run(this.db, job.done, job.progress);
        }, { connection });

        this.queues.set(jobName, queue);
        this.workers.set(jobName, worker);
    }
}
```

2. **Scheduling**
```javascript
class BullMQJobScheduler extends IJobScheduler {
    async schedule(name, config, data) {
        const queue = this.queues.get(name);
        
        switch (config.type) {
        case 'schedule':
            await queue.add(name, data, {
                repeat: { cron: config.value }
            });
            break;
        case 'once':
            await queue.add(name, data, {
                delay: config.value - Date.now()
            });
            break;
        case 'now':
            await queue.add(name, data);
            break;
        }
    }
}
```

3. **Lifecycle Management**
```javascript
class BullMQJobLifecycle extends IJobLifecycle {
    async close() {
        await Promise.all([
            ...this.queues.values()
        ].map(queue => queue.close()));
        
        await Promise.all([
            ...this.workers.values()
        ].map(worker => worker.close()));
    }
}
```

