#!/bin/bash

NUMACTL_STATUS=0

SERVICE_FILE_PATH=$(systemctl status mongod | grep "loaded" | awk -F';' '{print $1}' | awk -F'(' '{print $2}')

if grep -q "ExecStart=" "${SERVICE_FILE_PATH}"; then
    sed -i "/ExecStart=/d" "${SERVICE_FILE_PATH}"
fi

if [[ $NUMACTL_STATUS -eq 0 ]]; then
    echo "/usr/bin/mongod --quiet --config /etc/mongod.conf" >> "${SERVICE_FILE_PATH}"
else
    echo "/usr/bin/numactl --interleave=all /usr/bin/mongod --quiet --config /etc/mongod.conf" >> "${SERVICE_FILE_PATH}"
fi

systemctl daemon-reload
