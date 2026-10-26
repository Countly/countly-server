#!/bin/bash

#we have to check since we cannot continue unless
if [ -f /etc/redhat-release ]; then
    CENTOS_MAJOR="$(cat /etc/redhat-release |awk -F'[^0-9]+' '{ print $2 }')"

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

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

#npm 11 removed --unsafe-perm and --build-from-source, which the commands below still use
sudo npm install -g npm@10;

if [[ -f /usr/local/bin/npm && -f /usr/bin/npm ]]; then
    rm /usr/local/bin/npm
    ln -s /usr/bin/npm /usr/local/bin/npm
fi

#upgrade nodejs
if [ -f /etc/redhat-release ]; then
    curl -sL https://rpm.nodesource.com/setup_22.x | bash -
    yum clean all
    yum remove -y nodejs
    yum install -y nodejs
fi

if [ -f /etc/lsb-release ]; then
    wget -qO- https://deb.nodesource.com/setup_22.x | bash -
    apt-get -y install nodejs || (echo "Failed to install nodejs." ; exit)
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

(cd "$DIR/.." && sudo npm install --unsafe-perm && sudo npm install argon2 --build-from-source)
(cd "$DIR/../plugins/hooks" && sudo npm install --unsafe-perm)
