#!/bin/bash

MONGO_CONFIG_FILE="/etc/mongod.conf"
INDENT_LEVEL=$(grep dbPath ${MONGO_CONFIG_FILE} | awk -F"[ ]" '{for(i=1;i<=NF && ($i=="");i++);print i-1}')
INDENT_STRING=$(printf ' %.0s' $(seq 1 "$INDENT_LEVEL"))


if grep -q "slowOpThresholdMs" "$MONGO_CONFIG_FILE"; then
    sed -i "/slowOpThresholdMs/d" ${MONGO_CONFIG_FILE}
    sed -i "s#operationProfiling:#operationProfiling:\n${INDENT_STRING}slowOpThresholdMs: 10000#g" ${MONGO_CONFIG_FILE}
else
    sed -i "\$aoperationProfiling:\n${INDENT_STRING}slowOpThresholdMs: 10000" ${MONGO_CONFIG_FILE}
fi
