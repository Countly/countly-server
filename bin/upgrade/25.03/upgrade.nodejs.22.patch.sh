#!/bin/bash

# Updates Node.js to the latest 22.x patch release from the repository the
# install already uses (NodeSource on Ubuntu and on RHEL installs that ran
# upgrade.nodejs.22.sh; the AppStream nodejs:22 module on fresh RHEL installs),
# then restarts Countly so the running processes pick it up.
#
# A patch release keeps the Node.js module ABI, so the native addons (argon2,
# isolated-vm) need no rebuild; that is what makes this cheaper and safer than
# upgrade.nodejs.22.sh, which reinstalls node_modules. Standalone, like that
# script: not tied to the version gate, so any 25.03.x install on Node.js 22
# can run it, and safe to run again.
#
# The script fails when the installed version is still below NODE_MIN after
# the update, so a repository that has not caught up yet is not reported as
# patched; the message then says which script to run instead.

NODE_MIN="22.23.4"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

if [ "$(id -u)" != "0" ]; then
    echo "This script must be run as root"
    exit 1
fi

if [ -f /etc/redhat-release ]; then
    CENTOS_MAJOR="$(awk -F'[^0-9]+' '{ print $2 }' /etc/redhat-release)"

    if [[ "$CENTOS_MAJOR" != "8" && "$CENTOS_MAJOR" != "9" ]]; then
        echo "Unsupported OS version, only support CentOS/RHEL 8 and 9."
        exit 1
    fi
fi

if [ -f /etc/lsb-release ]; then
    UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";

    if [[ "$UBUNTU_YEAR" != "20" && "$UBUNTU_YEAR" != "22" && "$UBUNTU_YEAR" != "24" ]]; then
        echo "Unsupported OS version, only support Ubuntu 20, 22 and 24."
        exit 1
    fi
fi

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed; run bin/upgrade/25.03/upgrade.nodejs.22.sh"
    exit 1
fi

BEFORE="$(node -v | sed 's/^v//')"
if [[ "${BEFORE%%.*}" != "22" ]]; then
    echo "Node.js $BEFORE is installed; this script only patches 22.x. Run bin/upgrade/25.03/upgrade.nodejs.22.sh first."
    exit 1
fi

if [ -f /etc/redhat-release ]; then
    yum update -y nodejs
fi

if [ -f /etc/lsb-release ]; then
    apt-get update
    apt-get install -y --only-upgrade nodejs
fi

AFTER="$(node -v | sed 's/^v//')"
echo "Node.js $BEFORE -> $AFTER (required >= $NODE_MIN)"

# sort -V puts the lower version first; the update is complete when NODE_MIN
# is not strictly above the installed version
if [ "$(printf '%s\n%s\n' "$NODE_MIN" "$AFTER" | sort -V | head -n1)" != "$NODE_MIN" ]; then
    echo "Node.js is still below $NODE_MIN: the configured package repository does not carry it."
    if [ -f /etc/redhat-release ]; then
        echo "The RHEL AppStream module lags upstream; bin/upgrade/25.03/upgrade.nodejs.22.sh switches the install to NodeSource, which has it."
    else
        echo "Check that /etc/apt/sources.list.d/nodesource.list points at node_22.x; bin/upgrade/25.03/upgrade.nodejs.22.sh sets it up."
    fi
    exit 1
fi

#isolated-vm (hooks custom code) needs node started with --no-node-snapshot on
#Node.js 20 and later; add it to the supervisord commands of an existing install
SUPERVISORD_CONF="$DIR/config/supervisord.conf"
if [ -f "$SUPERVISORD_CONF" ] && ! grep -q -- "--no-node-snapshot" "$SUPERVISORD_CONF"; then
    sed -i 's#^command=node #command=node --no-node-snapshot #' "$SUPERVISORD_CONF"
    SUPERVISORD_CONF_CHANGED=1
fi

if [ "$BEFORE" = "$AFTER" ] && [ -z "$SUPERVISORD_CONF_CHANGED" ]; then
    echo "Node.js was already up to date and supervisord already passes --no-node-snapshot, nothing to restart"
    exit 0
fi

if command -v countly >/dev/null 2>&1; then
    countly restart
else
    echo "countly command not found; restart the Countly processes to pick up the new Node.js"
fi
