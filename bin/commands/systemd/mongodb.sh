#!/bin/bash

NUMACTL_STATUS=0

SERVICE_FILE_PATH=$(systemctl status mongod | grep "loaded" | awk -F';' '{print $1}' | awk -F'(' '{print $2}')

if [[ $NUMACTL_STATUS -eq 0 ]]; then
    sed -i "/ExecStart=/c\ExecStart=\/usr\/bin\/mongod --quiet --config \/etc\/mongod.conf" "${SERVICE_FILE_PATH}"
else
    sed -i "/ExecStart=/c\ExecStart=\/usr\/bin\/numactl --interleave=all \/usr\/bin/mongod --quiet --config \/etc\/mongod.conf" "${SERVICE_FILE_PATH}"
fi

systemctl daemon-reload
