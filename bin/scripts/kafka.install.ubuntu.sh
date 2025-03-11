#!/bin/bash
set -e

# Install dependencies
sudo apt update && sudo apt install -y openjdk-11-jdk wget

# Set variables
KAFKA_VERSION="3.6.0"
SCALA_VERSION="2.13"
KAFKA_DIR="/opt/kafka"
CONFIG_DIR="/config"

# Download and extract Kafka
wget -qO- "https://downloads.apache.org/kafka/${KAFKA_VERSION}/kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz" | sudo tar -xz -C /opt
sudo mv "/opt/kafka_${SCALA_VERSION}-${KAFKA_VERSION}" "$KAFKA_DIR"

# Ensure config directory exists
if [ ! -d "$CONFIG_DIR" ]; then
  echo "Config directory $CONFIG_DIR does not exist. Please create it and add required config files."
  exit 1
fi

# Copy Kafka configuration
sudo cp "$CONFIG_DIR/kafka.server.conf" "$KAFKA_DIR/config/kraft/server.properties"

# Format storage
sudo "$KAFKA_DIR/bin/kafka-storage.sh" format -t $(uuidgen) -c "$KAFKA_DIR/config/kraft/server.properties"

# Copy systemd service configuration
sudo cp "$CONFIG_DIR/kafka.service.conf" /etc/systemd/system/kafka.service

# Enable and start Kafka
sudo systemctl daemon-reload
sudo systemctl enable kafka
sudo systemctl start kafka

# Set up scheduler consumer environment
sudo cp "$CONFIG_DIR/kafka.consumer.conf" /etc/profile.d/kafka_env.sh
source /etc/profile.d/kafka_env.sh

# Print completion message
echo "Kafka installation and configuration completed successfully."