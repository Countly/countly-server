/**
 * Kafka Plugin - Aggregator Entry Point
 *
 * This file is loaded by the aggregator process via plugins.init({filename: "aggregator"})
 * Its primary purpose is to apply the KafkaJS RequestQueue fix before any Kafka clients
 * are created by the aggregator's event sources.
 *
 * The fix MUST be applied before KafkaEventSource or any other code imports kafkajs,
 * as it patches the RequestQueue prototype to prevent the infinite scheduling loop
 * bug (issues #1704, #1751).
 */

// Apply KafkaJS RequestQueue fix - MUST be first
require('./lib/kafkaRequestQueueFix');
