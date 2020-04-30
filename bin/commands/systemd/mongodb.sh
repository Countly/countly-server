#!/bin/bash

#if numactl is available we need to use this line
#/usr/bin/numactl --interleave=all /usr/bin/mongod --quiet --config /etc/mongod.conf
/usr/bin/mongod --quiet --config /etc/mongod.conf