#!/bin/bash

# Optional: moves an existing install from Node.js 22 to Node.js 26. Nothing runs it
# automatically and Countly keeps working on Node.js 22, so run it when you want to:
#
#   sudo bash bin/upgrade/25.03/upgrade.nodejs.26.sh
#
# then restart Countly. Like upgrade.nodejs.22.sh it reinstalls node_modules, because the
# native addons (argon2, isolated-vm) are built for one Node.js ABI. The hooks plugin
# then picks up isolated-vm 7, the build for Node.js 24 and later.
#
# Ubuntu 20.04 is refused: isolated-vm 7 has no binary for its glibc and cannot be built
# with its gcc 10, so hooks custom code would stop working there. It stays on Node.js 22.

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

    if [[ "$UBUNTU_YEAR" = "20" ]]; then
        echo "Ubuntu 20.04 stays on Node.js 22: hooks custom code needs isolated-vm 7 on Node.js 26,"
        echo "which cannot be installed there. Upgrade the OS to Ubuntu 22.04 or 24.04 first."
        exit 1
    fi

    if [[ "$UBUNTU_YEAR" != "22" && "$UBUNTU_YEAR" != "24" ]]; then
        echo "Unsupported OS version, only support Ubuntu 22 and 24."
        exit 1
    fi
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#npm 11 removed --unsafe-perm and --build-from-source, which the commands below still use
npm install -g npm@10;

if [[ -f /usr/local/bin/npm && -f /usr/bin/npm ]]; then
    rm /usr/local/bin/npm
    ln -s /usr/bin/npm /usr/local/bin/npm
fi

#upgrade nodejs
if [ -f /etc/redhat-release ]; then
    curl -sL https://rpm.nodesource.com/setup_26.x | bash -
    yum clean all
    yum remove -y nodejs
    yum install -y nodejs
fi

if [ -f /etc/lsb-release ]; then
    wget -qO- https://deb.nodesource.com/setup_26.x | bash -
    apt-get -y install nodejs || (echo "Failed to install nodejs." ; exit)
fi

NODE_MAJOR_NOW="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR_NOW" != "26" ]; then
    echo "Node.js is $(node --version) after the update, not 26; stopping before node_modules is touched."
    exit 1
fi

#isolated-vm has no prebuilt binary for glibc 2.28, so RHEL 8 builds it from source.
#That needs -std=c++20 and python>=3.8, and stock RHEL 8 has neither.
if [[ "$CENTOS_MAJOR" = "8" ]]; then
    yum install -y gcc-toolset-11 python38
    export npm_config_python=/usr/bin/python3.8
    # shellcheck disable=SC1091
    source /opt/rh/gcc-toolset-11/enable
fi

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf "$DIR/../node_modules"
rm -rf "$DIR/../plugins/hooks/node_modules"

#no sudo: the script runs as root, and sudo would reset PATH and drop
#npm_config_python, losing the RHEL 8 toolchain set up above
(cd "$DIR/.." && npm install --unsafe-perm && npm install argon2 --build-from-source)
(cd "$DIR/../plugins/hooks" && npm install --unsafe-perm)

#isolated-vm (hooks custom code) needs node started with --no-node-snapshot on
#Node.js 20 and later; add it to the supervisord commands of an existing install
SUPERVISORD_CONF="$DIR/config/supervisord.conf"
if [ -f "$SUPERVISORD_CONF" ] && ! grep -q -- "--no-node-snapshot" "$SUPERVISORD_CONF"; then
    sed -i 's#^command=node #command=node --no-node-snapshot #' "$SUPERVISORD_CONF"
    echo "Added --no-node-snapshot to $SUPERVISORD_CONF; it applies when Countly restarts"
fi

if [ ! -d "$DIR/../plugins/hooks/node_modules/isolated-vm-7" ]; then
    echo "Warning: isolated-vm 7 did not install, so hooks custom code effects will fail on Node.js 26."
    echo "Check the npm output above for the isolated-vm-7 build error."
fi

echo "Node.js $(node --version) installed. Restart Countly to run on it: countly restart"
