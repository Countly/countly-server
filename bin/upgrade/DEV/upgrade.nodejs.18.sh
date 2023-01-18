#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"

sudo npm install -g npm@latest;

if [[ -f /usr/local/bin/npm && -f /usr/bin/npm ]]; then
    rm /usr/local/bin/npm
    ln -s /usr/bin/npm /usr/local/bin/npm
fi

#upgrade nodejs
if [ -f /etc/redhat-release ]; then
    curl -sL https://rpm.nodesource.com/setup_18.x | bash -
    yum clean all
    yum remove -y nodejs
    yum install -y nodejs
fi

if [ -f /etc/lsb-release ]; then
    wget -qO- https://deb.nodesource.com/setup_18.x | bash -
    apt-get -y --force-yes install nodejs || (echo "Failed to install nodejs." ; exit)
fi

#remove previous dependencies, as they need to be rebuild for new nodejs version
rm -rf "$DIR/../node_modules"

(cd "$DIR/.." && sudo npm install --unsafe-perm && sudo npm install argon2 --build-from-source)