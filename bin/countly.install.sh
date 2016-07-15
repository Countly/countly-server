#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f /etc/lsb-release ]; then
    bash $DIR/countly.install_deb.sh
elif [ -f /etc/redhat-release ]; then
    bash $DIR/countly.install_rhel.sh
fi