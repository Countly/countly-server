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

    if [[ "$UBUNTU_YEAR" != "20" && "$UBUNTU_YEAR" != "22" ]]; then
        echo "Unsupported OS version, only support Ubuntu 20 and 22."
        exit 1
    fi
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

sudo npm install -g npm@latest;

if [[ -f /usr/local/bin/npm && -f /usr/bin/npm ]]; then
    rm /usr/local/bin/npm
    ln -s /usr/bin/npm /usr/local/bin/npm
fi

#upgrade nodejs
if [ -f /etc/redhat-release ]; then
    curl -sL https://rpm.nodesource.com/setup_20.x | bash -
    yum clean all
    yum remove -y nodejs
    yum install -y nodejs
fi

if [ -f /etc/lsb-release ]; then
    wget -qO- https://deb.nodesource.com/setup_20.x | bash -
    apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
fi

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf "$DIR/../node_modules"

(cd "$DIR/.." && sudo npm install --unsafe-perm && sudo npm install argon2 --build-from-source)