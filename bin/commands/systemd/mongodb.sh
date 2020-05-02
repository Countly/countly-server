#!/bin/bash

NUMACTL_STATUS=0

if [[ $NUMACTL_STATUS -eq 0 ]]
then
    /usr/bin/mongod --quiet --config /etc/mongod.conf
else
    /usr/bin/numactl --interleave=all /usr/bin/mongod --quiet --config /etc/mongod.conf
fi
