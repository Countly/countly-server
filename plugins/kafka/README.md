# Kafka Plugin for Countly

This plugin provides Kafka integration for Countly, enabling high-throughput event streaming, real-time data processing, and reliable message delivery. The plugin is designed with a modular architecture that allows for flexible usage patterns and easy customization.

## 📋 Table of Contents

- [🏗️ Architecture Overview](#%EF%B8%8F-architecture-overview)
- [🚀 Quick Start](#-quick-start)
- [🧩 Component Details](#-component-details)
  - [1. API Component (`api/api.js`)](#1-api-component-apiapiejs)
  - [2. KafkaClient (`lib/kafkaClient.js`)](#2-kafkaclient-libkafkaclientjs)
  - [3. KafkaBootstrapper (`lib/kafkaBootstrapper.js`)](#3-kafkabootstrapper-libkafkabootstrapperjs)
  - [4. KafkaProducer (`lib/kafkaProducer.js`)](#4-kafkaproducer-libkafkaproducerjs)
  - [5. KafkaConsumer (`lib/KafkaConsumer.js`)](#5-kafkaconsumer-libkafkaconsumerjs)
- [🔧 Configuration Reference](#-configuration-reference)
- [🎯 Usage Patterns](#-usage-patterns)
- [📊 Logging and Monitoring](#-logging-and-monitoring)
- [⚠️ Important Notes](#%EF%B8%8F-important-notes)
- [⚡ Flow Control and Performance Tuning](#-flow-control-and-performance-tuning)
  - [🎛️ Producer Flow Control](#%EF%B8%8F-producer-flow-control)
  - [🎛️ Consumer Flow Control](#%EF%B8%8F-consumer-flow-control)
  - [📊 Memory and Queue Management](#-memory-and-queue-management)
  - [🎯 Optimization Scenarios](#-optimization-scenarios)
  - [⚠️ Common Anti-Patterns](#%EF%B8%8F-common-anti-patterns)
  - [📈 Monitoring Flow Control](#-monitoring-flow-control)
- [🔒 Security Best Practices](#-security-best-practices)

## 🏗️ Architecture Overview

The Kafka plugin consists of several key components:

```
plugins/kafka/
├── api/
│   ├── api.js              # Plugin initialization and startup hook
│   └── lib/
│       ├── kafkaClient.js      # Connection management and base configuration
│       ├── kafkaBootstrapper.js # Infrastructure setup and topic management
│       ├── kafkaProducer.js    # Message production with transaction support
│       └── KafkaConsumer.js    # Message consumption with batch processing
└── README.md
```

## 🚀 Quick Start

### Enable Kafka Integration

1. **Configure Kafka** in your `api/config.js`:
```javascript
kafka: {
    enabled: true,
    rdkafka: {
        brokers: ["localhost:9092"],
        clientId: "countly-kafka-client"
    },
    drillEventsTopic: "countly-drill-events"
}
```

2. **Start Countly** - The plugin initializes automatically and:
   - Validates configuration
   - Connects to Kafka cluster
   - Creates required topics
   - Registers components with `common` object

3. **Access in your code**:
```javascript
const { KafkaProducer, KafkaConsumer, kafkaClient } = require('../../../api/utils/common.js');
```

## 🧩 Component Details

### 1. API Component (`api/api.js`)

**Role**: Plugin startup hook and automatic initialization

**What it does**:
- ⚠️ **Runs automatically** when Countly starts
- Validates Kafka configuration 
- Initializes `KafkaClient` instance
- Runs infrastructure bootstrap (topic creation)
- Registers Kafka components with `common` object for global access
- **Treats Kafka as hard dependency** - application exits on failure when enabled

**No direct API** - This runs automatically during Countly startup.

### 2. KafkaClient (`lib/kafkaClient.js`)

**Role**: Connection management and base configuration provider

**Responsibilities**:
- Manages Kafka broker connections
- Provides shared configuration for producers/consumers
- Handles authentication and security settings
- Creates Kafka instances with optimized settings

#### API

```javascript
const KafkaClient = require('./lib/kafkaClient');

// Create client (reads from countlyConfig.kafka)
const client = new KafkaClient();

// Get connection configuration
const config = client.getConnectionConfig();
// Returns: { brokers, clientId, requestTimeoutMs, connectionTimeoutMs, securityProtocol, ... }

// Build base librdkafka configuration
const baseConfig = client.buildBaseConfig();
// Returns: { 'bootstrap.servers', 'client.id', 'socket.timeout.ms', ... }

// Create admin client
const admin = client.createAdmin();

// Create Kafka instance with additional config
const kafka = client.createKafkaInstance({
    'batch.size': 1048576,
    'compression.type': 'lz4'
});
```

### 3. KafkaBootstrapper (`lib/kafkaBootstrapper.js`)

**Role**: Infrastructure setup and topic management

**Responsibilities**:
- Creates and manages Kafka topics
- Validates cluster health
- Configures topic settings (partitions, replication, retention)
- Provides topic metadata and information

#### API

```javascript
const KafkaBootstrapper = require('./lib/kafkaBootstrapper');

// Create bootstrapper (requires KafkaClient instance)
const bootstrapper = new KafkaBootstrapper(kafkaClient);

// Check cluster health
const isHealthy = await bootstrapper.checkClusterHealth();
// Returns: boolean

// Check if topic exists
const exists = await bootstrapper.topicExists('my-topic');
// Returns: boolean

// Create topic with options
const created = await bootstrapper.createTopic('my-topic', {
    partitions: 10,
    replicationFactor: 3,
    retentionMs: 604800000  // 7 days
});
// Returns: boolean

// Bootstrap all required infrastructure
const result = await bootstrapper.bootstrap();
// Returns: { success: boolean, topics: string[], errors: string[] }

// Get topic metadata
const info = await bootstrapper.getTopicInfo('my-topic');
// Returns: { name, partitions, replicationFactor, partitionDetails }

// Clean up
await bootstrapper.disconnect();
```

### 4. KafkaProducer (`lib/kafkaProducer.js`)

**Role**: High-performance message production with transaction support

**Responsibilities**:
- Sends events to Kafka topics
- Handles batching and compression
- Supports transactions for exactly-once delivery
- Manages connection lifecycle and error handling
- Generates partition keys for optimal distribution

#### API

```javascript
const KafkaProducer = require('./lib/kafkaProducer');

// Create producer
const producer = new KafkaProducer(kafkaClient, {
    topicName: 'my-events',           // Override default topic
    transactionalIdPrefix: 'my-app'   // Custom transactional ID prefix
});

// Send events (main method)
const result = await producer.sendEvents([
    { a: 'app123', uid: 'user456', e: 'purchase', value: 100 },
    { a: 'app123', uid: 'user789', e: 'login', timestamp: Date.now() }
], 'optional-topic-override');
// Returns: { success: boolean, sent: number }

// Disconnect producer
await producer.disconnect();
```

**Event Format**:
Events are automatically converted to Kafka messages with:
- **Key**: Generated from `${a}-${uid}:${e}` for optimal partitioning
- **Value**: JSON-stringified event data
- **Headers**: Metadata including content-type, app-id, event-type, user-id, ingestion-time

**Transaction Support**:
When `enableTransactions: true` in config, producers automatically use transactions for exactly-once delivery.

### 5. KafkaConsumer (`lib/KafkaConsumer.js`)

**Role**: Batch message processing with exactly-once guarantees

**Responsibilities**:
- Consumes messages in configurable batches
- Provides exactly-once processing semantics
- Handles consumer group management and rebalancing  
- Supports graceful shutdown and error recovery
- Configurable invalid JSON handling

#### API

```javascript
const KafkaConsumer = require('./lib/KafkaConsumer');

// Create consumer
const consumer = new KafkaConsumer(kafkaClient, 'my-consumer-group', {
    topics: ['topic1', 'topic2'],           // Multiple topics
    // OR
    topic: 'single-topic',                  // Single topic
    autoOffsetReset: 'earliest',            // 'earliest' or 'latest'
    partitionsConsumedConcurrently: 3       // Optional performance tuning
});

// Start consuming with handler
await consumer.start(async ({ topic, partition, batch, records }) => {
    // Process batch of records
    console.log(`Processing ${records.length} records from ${topic}[${partition}]`);
    
    for (const { event, message, headers } of records) {
        // Your processing logic here
        await processEvent(event);
        
        // Access message metadata
        console.log(`Offset: ${message.offset}, Key: ${message.key}`);
        console.log(`Headers:`, headers);
    }
    
    // Batch processed successfully - offsets auto-committed
});

// Control methods
await consumer.pause();    // Pause consumption
await consumer.resume();   // Resume consumption  
await consumer.stop();     // Stop and disconnect
```

**Handler Function Parameters**:
- `topic` (string): Topic name
- `partition` (number): Partition number
- `batch` (object): Raw Kafka batch object
- `records` (array): Parsed records with structure:
  - `event` (object): Parsed JSON event data
  - `message` (object): Raw Kafka message with `offset`, `key`, `value`
  - `headers` (object): Message headers

**Error Handling**:
- **Invalid JSON**: Configurable behavior (`skip`, `fail`)
- **Handler Errors**: Batch retried automatically
- **Offset Management**: Only committed after successful processing
- **Graceful Shutdown**: Handles SIGTERM/SIGINT with proper cleanup

## 🔧 Configuration Reference

### Complete Configuration Example

```javascript
kafka: {
    // === CORE SETTINGS ===
    enabled: true,                           // Enable Kafka (becomes hard dependency)
    drillEventsTopic: "countly-drill-events", // Default topic name
    groupIdPrefix: "cly_",                   // Consumer group prefix
    
    // === TOPIC DEFAULTS ===
    partitions: 10,                          // Default partitions for new topics
    replicationFactor: 3,                    // Default replication (use 3+ in production)
    retentionMs: 604800000,                  // 7 days retention
    
    // === TRANSACTION SETTINGS ===
    enableTransactions: false,               // Enable exactly-once producers
    transactionalId: "countly",              // Transactional ID prefix
    transactionTimeout: 60000,               // Transaction timeout (60s)
    
    // === CONNECTION SETTINGS ===
    rdkafka: {
        brokers: ["localhost:9092"],         // Kafka broker list
        clientId: "countly-kafka-client",    // Client identifier
        requestTimeoutMs: 30000,             // Request timeout
        connectionTimeoutMs: 10000,          // Connection timeout
        
        // Security (optional)
        securityProtocol: "SASL_SSL",        // PLAINTEXT, SSL, SASL_PLAINTEXT, SASL_SSL
        saslMechanism: "SCRAM-SHA-256",      // PLAIN, SCRAM-SHA-256, SCRAM-SHA-512, GSSAPI
        saslUsername: "username",
        saslPassword: "password",
        
        // Producer tuning
        lingerMs: 5,                         // Batching delay
        retries: 8,                          // Retry attempts
        initialRetryTime: 100,               // Initial retry delay
        maxRetryTime: 30000,                 // Max retry delay
        acks: -1                             // -1=all replicas, 1=leader, 0=none
    },
    
    // === PRODUCER SETTINGS ===
    producer: {
        batchSize: 1048576,                  // 1MB batch size
        batchNumMessages: 10000,             // Max messages per batch
        queueBufferingMaxMessages: 100000,   // Producer queue size
        queueBufferingMaxKbytes: 1048576,    // Producer queue memory (1GB)
        compressionLevel: 1,                 // LZ4 compression level
        messageTimeoutMs: 300000,            // Message timeout (5min)
        deliveryTimeoutMs: 300000            // Delivery timeout (5min)
    },
    
    // === CONSUMER SETTINGS ===
    consumer: {
        fetchMinBytes: 1024,                 // Min fetch size (1KB)
        fetchMaxWaitMs: 500,                 // Max fetch wait time
        fetchMaxBytes: 52428800,             // Max fetch size (50MB)
        maxPartitionFetchBytes: 1048576,     // Max per-partition fetch (1MB)
        queuedMinMessages: 100000,           // Min queued messages
        queuedMaxMessagesKbytes: 1048576,    // Max queue memory (1GB)
        sessionTimeoutMs: 30000,             // Session timeout (30s)
        maxPollIntervalMs: 300000,           // Max poll interval (5min)
        autoOffsetReset: "latest",           // "earliest" or "latest"
        enableAutoCommit: false,             // Use manual commits
        invalidJsonBehavior: "skip",         // "skip" or "fail"
        invalidJsonMetrics: true             // Enable invalid JSON metrics
    }
}
```

## 🎯 Usage Patterns

### 1. Basic Event Production

```javascript
// Get producer from common
const { KafkaProducer, kafkaClient } = require('../../../api/utils/common.js');

// Create producer for specific use case
const analyticsProducer = new KafkaProducer(kafkaClient, {
    topicName: 'analytics-events'
});

// Send events
await analyticsProducer.sendEvents([
    { a: 'mobile-app', uid: 'user123', e: 'screen_view', screen: 'home' },
    { a: 'mobile-app', uid: 'user123', e: 'button_click', button: 'purchase' }
]);
```

### 2. Custom Consumer for Real-time Processing

```javascript
const { KafkaConsumer, kafkaClient } = require('../../../api/utils/common.js');

// Create specialized consumer
const segmentationConsumer = new KafkaConsumer(kafkaClient, 'segmentation-processor', {
    topics: ['user-events', 'purchase-events'],
    autoOffsetReset: 'earliest'
});

// Process events for segmentation
await segmentationConsumer.start(async ({ records }) => {
    for (const { event } of records) {
        if (event.e === 'purchase') {
            await updateUserSegment(event.uid, 'purchaser');
        }
        
        await updateUserActivity(event.uid, event.e);
    }
});
```

### 3. Multi-Consumer Application

```javascript
// Consumer for different purposes with different group IDs
const [metricsConsumer, alertsConsumer] = await Promise.all([
    new KafkaConsumer(kafkaClient, 'metrics-aggregator', {
        topic: 'drill-events',
        autoOffsetReset: 'latest'
    }),
    
    new KafkaConsumer(kafkaClient, 'alerts-processor', {
        topic: 'drill-events', 
        autoOffsetReset: 'latest'
    })
]);

// Start both consumers
await Promise.all([
    metricsConsumer.start(async ({ records }) => {
        // Aggregate metrics
        await processMetrics(records);
    }),
    
    alertsConsumer.start(async ({ records }) => {
        // Check for alert conditions
        await checkAlerts(records);
    })
]);
```

### 4. Topic Management

```javascript
const { kafkaClient } = require('../../../api/utils/common.js');
const KafkaBootstrapper = require('../plugins/kafka/api/lib/kafkaBootstrapper');

const bootstrapper = new KafkaBootstrapper(kafkaClient);

// Create custom topics
await bootstrapper.createTopic('user-profiles', {
    partitions: 20,
    replicationFactor: 3,
    retentionMs: 2592000000  // 30 days
});

// Check topic info
const info = await bootstrapper.getTopicInfo('user-profiles');
console.log(`Topic has ${info.partitions} partitions`);
```

## 📊 Logging and Monitoring

### Log Namespaces

- `kafka:client` - Connection and authentication
- `kafka:producer` - Message production and transactions  
- `kafka:consumer` - Message consumption and processing
- `kafka:bootstrapper` - Infrastructure and topic management

### Enable Debug Logging

```javascript
// In config.js
logging: {
    debug: ['kafka:consumer', 'kafka:producer'],
    info: ['kafka:client'],
    default: 'warn'
}
```

### Monitoring Metrics

The consumer automatically tracks:
- Invalid JSON message counts
- Batch processing statistics
- Partition assignment changes
- Connection health

## ⚠️ Important Notes

### Hard Dependency Behavior
When `kafka.enabled: true`, Kafka becomes a **hard dependency**:
- Application **exits** if Kafka connection fails during startup
- No graceful degradation or fallback behavior
- Ensures consistent behavior across environments

### Transaction Guarantees
- **Producers**: Exactly-once delivery when `enableTransactions: true`
- **Consumers**: Exactly-once processing with manual offset commits
- **Batching**: Entire batches succeed or fail atomically

### Performance Considerations
- **Producers**: Batch multiple events for optimal throughput
- **Consumers**: Process records in batches, avoid blocking operations
- **Partitioning**: Events auto-partitioned by `app-user:event` for optimal distribution
- **Connection Pooling**: Each producer/consumer uses optimized connection settings

### Error Handling
- **Network issues**: Automatic retries with exponential backoff
- **Invalid data**: Configurable behavior (skip vs fail)
- **Consumer failures**: Batch retry with offset preservation
- **Graceful shutdown**: Signal handlers ensure clean disconnection

## ⚡ Flow Control and Performance Tuning

Understanding Kafka's flow control mechanisms is crucial for optimizing both **throughput** and **data reliability**. These settings represent fundamental trade-offs in distributed streaming systems.

### 🎛️ **Producer Flow Control**

#### **Batching Parameters**

| Parameter | Default | Purpose | Throughput Impact | Reliability Impact |
|-----------|---------|---------|-------------------|-------------------|
| `batchSize` | 1MB | Max bytes per batch | ⬆️ Larger = Higher throughput | ➡️ Neutral (affects latency) |
| `batchNumMessages` | 10,000 | Max messages per batch | ⬆️ More messages = Higher throughput | ➡️ Neutral |
| `lingerMs` | 5ms | Wait time for more messages | ⬆️ Higher = Better batching | ⬇️ Higher = More latency |

**Tuning Guide:**
```javascript
// High Throughput (batch processing)
producer: {
    batchSize: 2097152,        // 2MB - larger batches
    batchNumMessages: 50000,   // 50K messages per batch  
    lingerMs: 100              // Wait 100ms for more messages
}

// Low Latency (real-time)
producer: {
    batchSize: 262144,         // 256KB - smaller batches
    batchNumMessages: 1000,    // 1K messages per batch
    lingerMs: 1                // Send immediately
}
```

#### **Acknowledgment Settings**

| `acks` Value | Reliability | Throughput | Data Loss Risk |
|--------------|-------------|------------|----------------|
| `0` | ❌ None | 🟢 Highest | 🔴 High - No confirmation |
| `1` | 🟡 Leader only | 🟡 Medium | 🟡 Medium - Leader failure risk |
| `-1` (all) | 🟢 All replicas | 🔴 Lowest | 🟢 Minimal - Fully replicated |

**Recommendation**: Always use `acks: -1` for production data.

#### **Retry and Timeout Settings**

```javascript
rdkafka: {
    retries: 8,                    // Number of retry attempts
    initialRetryTime: 100,         // Start with 100ms delay
    maxRetryTime: 30000,          // Cap at 30s delay
    messageTimeoutMs: 300000,     // 5min total message timeout
    deliveryTimeoutMs: 300000     // 5min delivery timeout (includes retries)
}
```

**Flow Control Impact:**
- **Higher retries** = Better reliability, but slower failure detection
- **Longer timeouts** = Better reliability under load, but slower error propagation
- **Shorter timeouts** = Faster failure detection, but may drop messages during spikes

### 🎛️ **Consumer Flow Control**

#### **Fetch Parameters**

| Parameter | Default | Purpose | Throughput Impact | Memory Impact |
|-----------|---------|---------|-------------------|---------------|
| `fetchMinBytes` | 1KB | Min bytes before returning | ⬇️ Higher = Wait for more data | ⬆️ Higher = More buffering |
| `fetchMaxBytes` | 50MB | Max bytes per fetch | ⬆️ Higher = Larger batches | ⬆️ Higher = More memory |
| `fetchMaxWaitMs` | 500ms | Max wait for min bytes | ⬇️ Higher = Larger batches | ➡️ Latency trade-off |
| `maxPartitionFetchBytes` | 1MB | Max bytes per partition | ⬆️ Higher = Better throughput | ⬆️ Higher = More memory |

**Tuning Strategies:**

```javascript
// High Throughput Processing
consumer: {
    fetchMinBytes: 10240,          // 10KB - wait for meaningful data
    fetchMaxBytes: 104857600,      // 100MB - large fetch requests
    fetchMaxWaitMs: 1000,          // 1s - allow larger batches
    maxPartitionFetchBytes: 2097152 // 2MB per partition
}

// Low Latency Processing  
consumer: {
    fetchMinBytes: 1,              // 1 byte - return immediately
    fetchMaxBytes: 1048576,        // 1MB - smaller fetches
    fetchMaxWaitMs: 10,            // 10ms - minimal wait
    maxPartitionFetchBytes: 262144  // 256KB per partition
}

// Balanced (Default)
consumer: {
    fetchMinBytes: 1024,           // 1KB
    fetchMaxBytes: 52428800,       // 50MB  
    fetchMaxWaitMs: 500,           // 500ms
    maxPartitionFetchBytes: 1048576 // 1MB
}
```

#### **Session and Polling Timeouts**

| Parameter | Default | Purpose | Reliability Impact |
|-----------|---------|---------|-------------------|
| `sessionTimeoutMs` | 30s | Consumer heartbeat timeout | ⬇️ Lower = Faster failure detection, more rebalances |
| `maxPollIntervalMs` | 5min | Max time between polls | ⬇️ Lower = Faster detection, risk of false positives |

**Critical Balance:**
- **Too low**: Unnecessary rebalances during processing spikes
- **Too high**: Slow detection of truly failed consumers
- **Rule of thumb**: `sessionTimeoutMs` should be 10-30% of `maxPollIntervalMs`

### 📊 **Memory and Queue Management**

#### **Producer Queuing**

```javascript
producer: {
    queueBufferingMaxMessages: 100000,  // Messages buffered in producer
    queueBufferingMaxKbytes: 1048576    // 1GB memory limit
}
```

**Behavior:**
- **Full queue** → Producer blocks or drops messages (depends on config)
- **Large queues** → Better throughput, more memory usage
- **Small queues** → Lower memory, potential blocking under load

#### **Consumer Queuing**

```javascript
consumer: {
    queuedMinMessages: 100000,          // Min messages before consuming
    queuedMaxMessagesKbytes: 1048576    // 1GB queue memory limit
}
```

**Flow Control:**
- Controls how much data consumer buffers internally
- Larger queues smooth out processing variations
- Monitor memory usage to prevent OOM

### 🎯 **Optimization Scenarios**

#### **1. Real-Time Analytics (Low Latency)**
```javascript
// Prioritize speed over batching efficiency
kafka: {
    rdkafka: {
        lingerMs: 0,                    // Send immediately
        acks: 1                         // Leader acknowledgment only
    },
    producer: {
        batchSize: 16384,               // 16KB batches
        batchNumMessages: 100           // Small batches
    },
    consumer: {
        fetchMinBytes: 1,               // Return immediately  
        fetchMaxWaitMs: 10,             // Minimal wait
        sessionTimeoutMs: 10000         // 10s - faster failure detection
    }
}
```

#### **2. Bulk Data Processing (High Throughput)**
```javascript
// Prioritize efficiency over latency
kafka: {
    rdkafka: {
        lingerMs: 100,                  // Wait for batching
        acks: -1                        // Full reliability
    },
    producer: {
        batchSize: 2097152,             // 2MB batches
        batchNumMessages: 50000,        // Large batches
        compressionLevel: 6             // Higher compression
    },
    consumer: {
        fetchMinBytes: 65536,           // 64KB minimum
        fetchMaxBytes: 104857600,       // 100MB fetches
        fetchMaxWaitMs: 2000            // 2s wait for large batches
    }
}
```

#### **3. Mission-Critical Data (Maximum Reliability)**
```javascript
// Prioritize data safety over performance
kafka: {
    enableTransactions: true,           // Enable transactions
    rdkafka: {
        acks: -1,                       // All replicas must confirm
        retries: 16,                    // Many retry attempts
        lingerMs: 50                    // Reasonable batching
    },
    producer: {
        messageTimeoutMs: 600000,       // 10min timeout
        deliveryTimeoutMs: 600000       // 10min total delivery time
    },
    consumer: {
        enableAutoCommit: false,        // Manual offset management
        sessionTimeoutMs: 60000,        // 1min - conservative timeout
        invalidJsonBehavior: "fail"     // Fail on any data issues
    }
}
```

### ⚠️ **Common Anti-Patterns**

#### **❌ Don't Do This:**
```javascript
// This configuration will cause problems
kafka: {
    rdkafka: {
        acks: 0,                        // ❌ Data loss risk
        retries: 0,                     // ❌ No resilience
        lingerMs: 0                     // ❌ Poor batching
    },
    producer: {
        batchSize: 1,                   // ❌ No batching benefit
        messageTimeoutMs: 1000          // ❌ Too short, will drop messages
    },
    consumer: {
        fetchMinBytes: 52428800,        // ❌ Always wait for 50MB
        sessionTimeoutMs: 1000,         // ❌ Too short, constant rebalancing
        enableAutoCommit: true          // ❌ Risk of data loss
    }
}
```

### 📈 **Monitoring Flow Control**

**Key Metrics to Watch:**
- **Producer**: Queue depth, batch sizes, retry rates
- **Consumer**: Lag, fetch sizes, rebalance frequency  
- **Broker**: Request queue time, network utilization
- **Application**: Processing time per batch, error rates

**Tuning Process:**
1. **Start with defaults**
2. **Monitor under realistic load**
3. **Identify bottlenecks** (CPU, memory, network, or processing logic)
4. **Adjust parameters** incrementally
5. **Measure impact** on both throughput and reliability
6. **Repeat** until optimal balance achieved

## 🔒 Security Best Practices

1. **Use SASL/SSL** in production environments
2. **Limit topic access** via Kafka ACLs
3. **Monitor consumer lag** to detect processing issues
4. **Set appropriate timeouts** to prevent resource exhaustion
5. **Use transactions** for critical data paths
6. **Validate event schemas** before production

---

For more information about Kafka concepts and administration, see the [Apache Kafka Documentation](https://kafka.apache.org/documentation/).