#!/bin/bash

ENABLE_MONGOD="yes"
CONF=/etc/mongod.conf
DAEMON=/usr/bin/mongod
DAEMONUSER=${DAEMONUSER:-mongodb}

if [ -f /etc/default/mongod ]; then . /etc/default/mongod; fi

# Handle NUMA access to CPUs (SERVER-3574)
# This verifies the existence of numactl as well as testing that the command works
NUMACTL_ARGS="--interleave=all"
if which numactl >/dev/null 2>/dev/null && numactl $NUMACTL_ARGS ls / >/dev/null 2>/dev/null
then
  NUMACTL="$(which numactl) -- $NUMACTL_ARGS"
  DAEMON_OPTS=${DAEMON_OPTS:-"--config $CONF"}
else
  NUMACTL=""
  DAEMON_OPTS="-- "${DAEMON_OPTS:-"--config $CONF"}
fi

if [ "x$ENABLE_MONGOD" = "xyes" ]
then
  exec start-stop-daemon --start --chuid $DAEMONUSER --exec $NUMACTL $DAEMON $DAEMON_OPTS
fi