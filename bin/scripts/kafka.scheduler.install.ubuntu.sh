# 🧩 Install Kafka Message Scheduler (v0.0.7)
SCHEDULER_VERSION="0.0.7"
CONNECTOR_DIR="${KAFKA_DIR}/plugins/kafka-message-scheduler"
mkdir -p $CONNECTOR_DIR

echo "📦 Downloading Kafka Message Scheduler v${SCHEDULER_VERSION}..."
curl -L -o ${CONNECTOR_DIR}/kafka-message-scheduler-${SCHEDULER_VERSION}-all.jar \
  https://github.com/etf1/kafka-message-scheduler/releases/download/v${SCHEDULER_VERSION}/kafka-message-scheduler-${SCHEDULER_VERSION}-all.jar

echo "⚙️ Creating scheduler connector config..."
cat <<EOF > /opt/countly/bin/config/message-scheduler-connector.json
{
  "name": "message-scheduler-connector",
  "config": {
    "connector.class": "com.etf1.kafka.scheduler.connector.MessageSchedulerSinkConnector",
    "tasks.max": "1",
    "topics": "CLY_PUSH_MESSAGE_SCHEDULE",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.storage.StringConverter",
    "schedule.interval.ms": "10000",
    "storage.topic": "__scheduler_internal",
    "bootstrap.servers": "127.0.0.1:9091"
  }
}
EOF

# 🚀 Optional: Launch Kafka Connect in standalone mode with the connector
echo "🚀 Starting Kafka Connect with Scheduler plugin..."
cat <<EOF > /opt/countly/bin/config/connect-standalone.properties
bootstrap.servers=127.0.0.1:9091
key.converter=org.apache.kafka.connect.storage.StringConverter
value.converter=org.apache.kafka.connect.storage.StringConverter
plugin.path=${KAFKA_DIR}/plugins
EOF

nohup ${KAFKA_DIR}/bin/connect-standalone.sh \
  /opt/countly/bin/config/connect-standalone.properties \
  /opt/countly/bin/config/message-scheduler-connector.json > /var/log/kafka-scheduler.log 2>&1 &
