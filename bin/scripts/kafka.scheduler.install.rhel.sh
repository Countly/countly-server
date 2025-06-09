#!/bin/bash

set -e

KAFKA_DIR="/opt/kafka"
CONNECTOR_VERSION="0.0.7"
CONNECTOR_DIR="${KAFKA_DIR}/plugins/kafka-message-scheduler"
CONFIG_DIR="/opt/countly/bin/config"

echo "📦 Installing Kafka Message Scheduler v${CONNECTOR_VERSION}..."
mkdir -p "${CONNECTOR_DIR}"
curl -L -o "${CONNECTOR_DIR}/kafka-message-scheduler-${CONNECTOR_VERSION}-all.jar" \
  https://github.com/etf1/kafka-message-scheduler/releases/download/v${CONNECTOR_VERSION}/kafka-message-scheduler-${CONNECTOR_VERSION}-all.jar

echo "🧾 Creating scheduler connector config..."
mkdir -p "${CONFIG_DIR}"
cat <<EOF > "${CONFIG_DIR}/message-scheduler-connector.json"
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

echo "⚙️ Creating Kafka Connect config (standalone mode)..."
cat <<EOF > "${CONFIG_DIR}/connect-standalone.properties"
bootstrap.servers=127.0.0.1:9091
key.converter=org.apache.kafka.connect.storage.StringConverter
value.converter=org.apache.kafka.connect.storage.StringConverter
plugin.path=${KAFKA_DIR}/plugins
EOF

echo "🚀 Launching Kafka Connect with Scheduler connector..."
nohup "${KAFKA_DIR}/bin/connect-standalone.sh" \
  "${CONFIG_DIR}/connect-standalone.properties" \
  "${CONFIG_DIR}/message-scheduler-connector.json" > /var/log/kafka-scheduler.log 2>&1 &

echo "✅ Scheduler is running (Kafka Connect standalone mode)."
echo "📝 Logs: /var/log/kafka-scheduler.log"