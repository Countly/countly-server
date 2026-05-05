package dev.you.smt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.kafka.common.config.ConfigDef;
import org.apache.kafka.connect.connector.ConnectRecord;
import org.apache.kafka.connect.transforms.Transformation;

import java.util.Map;

/**
 * Kafka Connect Single Message Transform (SMT) for the countly-sink-raw connector.
 *
 * Purpose: consumes drill-events Kafka messages that contain a `raw` delta field
 * (added by the PII processor when obfuscation occurred) and reconstructs the full
 * original event so it can be written to the drill_events_raw ClickHouse table.
 *
 * Behaviour:
 *  - If the message has no `raw` field → returns null (tombstone), skipping the record.
 *    Only events that were PII-obfuscated get written to drill_events_raw.
 *  - If the message has a `raw` field → deep-merges each sub-object in `raw` back into
 *    the corresponding top-level field of the event, then removes the `raw` field.
 *    Example: raw.sg.vin = "123" is merged into sg.vin, restoring the original value.
 *
 * Deployment: place the compiled JAR in the Kafka Connect plugin path alongside the
 * ClickHouse sink connector JAR (see Dockerfile-kafka-connect-clickhouse-dev).
 * Register via clickhouse-connector-raw.json:
 *   "transforms": "extractRaw",
 *   "transforms.extractRaw.type": "dev.you.smt.RawEventExtractor"
 */
public class RawEventExtractor<R extends ConnectRecord<R>> implements Transformation<R> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Recursively merge all entries from source into target.
     * For keys present in both where both values are objects, recurse.
     * For all other cases, set the target key to the source value.
     */
    private static void deepMergeSg(ObjectNode target, JsonNode source) {
        source.fields().forEachRemaining(entry -> {
            String key = entry.getKey();
            JsonNode srcVal = entry.getValue();
            JsonNode tgtVal = target.get(key);
            if (srcVal.isObject() && tgtVal != null && tgtVal.isObject()) {
                deepMergeSg((ObjectNode) tgtVal, srcVal);
            } else {
                target.set(key, srcVal);
            }
        });
    }

    @Override
    public R apply(R record) {
        if (record.value() == null) {
            return null;
        }

        try {
            // Parse value — KafkaEventSink serialises events as plain JSON strings.
            String json = record.value() instanceof String
                    ? (String) record.value()
                    : MAPPER.writeValueAsString(record.value());

            JsonNode root = MAPPER.readTree(json);

            if (!root.isObject()) {
                return null;
            }

            ObjectNode event = (ObjectNode) root;

            // Filter: skip events that were never PII-obfuscated.
            if (!event.has("raw") || event.get("raw").isNull()) {
                return null;
            }

            JsonNode rawDelta = event.get("raw");

            if (!rawDelta.isObject()) {
                return null;
            }

            // Step 1: rename obfuscated key aliases back to their original names in place.
            // Done before the value merge so that:
            //   - key-only renames: value is preserved as-is (no raw.sg entry for these)
            //   - key+value renames: value under the original key is then overwritten by deepMergeSg
            // Each entry: { "path": ["parent", ...], "original": "vin", "obfuscated": "v**" }
            if (rawDelta.has("sg_renames") && rawDelta.get("sg_renames").isArray()) {
                JsonNode existingSg = event.get("sg");
                if (existingSg != null && existingSg.isObject()) {
                    rawDelta.get("sg_renames").forEach(rename -> {
                        JsonNode parent = existingSg;
                        JsonNode pathArr = rename.get("path");
                        if (pathArr != null && pathArr.isArray()) {
                            for (JsonNode step : pathArr) {
                                if (parent == null || !parent.isObject()) {
                                    parent = null;
                                    break;
                                }
                                parent = parent.get(step.asText());
                            }
                        }
                        if (parent != null && parent.isObject()) {
                            JsonNode obfuscatedNode = rename.get("obfuscated");
                            JsonNode originalNode = rename.get("original");
                            if (obfuscatedNode != null && originalNode != null) {
                                String obfuscated = obfuscatedNode.asText();
                                String original = originalNode.asText();
                                JsonNode value = parent.get(obfuscated);
                                if (value != null) {
                                    ((ObjectNode) parent).set(original, value);
                                    ((ObjectNode) parent).remove(obfuscated);
                                }
                            }
                        }
                    });
                }
            }

            // Step 2: deep-merge sparse value delta (only keys whose values were obfuscated/blocked).
            // For key+value obfuscation this overwrites the still-obfuscated value moved in step 1.
            if (rawDelta.has("sg") && rawDelta.get("sg").isObject()) {
                JsonNode sgDelta = rawDelta.get("sg");
                JsonNode existingSg = event.get("sg");
                if (existingSg != null && existingSg.isObject()) {
                    deepMergeSg((ObjectNode) existingSg, sgDelta);
                } else {
                    event.set("sg", sgDelta);
                }
            }

            // Restore all other top-level fields (e.g. "n" for the event key).
            rawDelta.fields().forEachRemaining(entry -> {
                String fieldName = entry.getKey();
                if (fieldName.equals("sg") || fieldName.equals("sg_renames")) {
                    return;
                }
                JsonNode rawValue = entry.getValue();
                if (rawValue == null || rawValue.isNull()) {
                    return;
                }
                event.set(fieldName, rawValue);
            });

            // Remove the raw delta field so ClickHouse doesn't see it.
            event.remove("raw");

            return record.newRecord(
                    record.topic(),
                    record.kafkaPartition(),
                    record.keySchema(),
                    record.key(),
                    record.valueSchema(),
                    event.toString(),
                    record.timestamp()
            );

        }
        catch (Exception e) {
            // On any parse failure, skip the record rather than failing the connector.
            return null;
        }
    }

    @Override
    public ConfigDef config() {
        return new ConfigDef();
    }

    @Override
    public void configure(Map<String, ?> configs) {
        // No configuration required.
    }

    @Override
    public void close() {
        // Nothing to close.
    }
}
