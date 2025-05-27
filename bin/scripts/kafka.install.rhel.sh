#!/bin/bash

set -e

KAFKA_VERSION="3.6.1"
SCALA_VERSION="2.13"
KAFKA_DIR="/opt/kafka"
KAFKA_USER="root"

echo "🔧 Updating system and installing Java..."
sudo dnf update -y
sudo dnf install -y java-11-openjdk curl tar

echo "📥 Downloading Kafka..."
cd /opt
sudo curl -o kafka.tgz https://archive.apache.org/dist/kafka/${KAFKA_VERSION}/kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz
sudo tar -xvzf kafka.tgz
sudo mv kafka_${SCALA_VERSION}-${KAFKA_VERSION} kafka
sudo chown -R $USER:$USER kafka

echo "⚙️ Setting up server.properties..."
cat <<EOF > ${KAFKA_DIR}/config/kraft/server.properties
node.id=1
process.roles=broker,controller
listeners=CONTROLLER://127.0.0.1:19093,BROKER_HOST://127.0.0.1:9092,BROKER_INTERNAL://127.0.0.1:9091
advertised.listeners=BROKER_HOST://127.0.0.1:19092,BROKER_INTERNAL://127.0.0.1:9091
listener.security.protocol.map=CONTROLLER:PLAINTEXT,BROKER_HOST:PLAINTEXT,BROKER_INTERNAL:PLAINTEXT
controller.listener.names=CONTROLLER
controller.quorum.voters=1@127.0.0.1:19093
inter.broker.listener.name=BROKER_INTERNAL
offsets.topic.replication.factor=1
group.initial.rebalance.delay.ms=0
transaction.state.log.min.isr=1
transaction.state.log.replication.factor=1
log.dirs=/tmp/kraft-combined-logs
EOF

echo "🔐 Initializing KRaft metadata..."
CLUSTER_ID=$(${KAFKA_DIR}/bin/kafka-storage.sh random-uuid)
${KAFKA_DIR}/bin/kafka-storage.sh format -t $CLUSTER_ID -c ${KAFKA_DIR}/config/kraft/server.properties

echo "📝 Setting up kafka.service..."
sudo tee /etc/systemd/system/kafka.service > /dev/null <<EOF
[Unit]
Description=Apache Kafka
After=network.target

[Service]
User=${KAFKA_USER}
ExecStart=${KAFKA_DIR}/bin/kafka-server-start.sh ${KAFKA_DIR}/config/kraft/server.properties
Restart=always
LimitNOFILE=100000

[Install]
WantedBy=multi-user.target
EOF

echo "🔄 Reloading systemd and starting Kafka..."
sudo systemctl daemon-reload
sudo systemctl enable kafka
sudo systemctl start kafka


echo "✅ Kafka installation (KRaft mode) complete."
echo "👉 Run 'source /opt/countly/bin/config/kafka.consumer.conf' to load environment variables."