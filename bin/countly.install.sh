#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DATE=`date +%Y-%m-%d:%H:%M:%S`
if [ -f /etc/lsb-release ]; then
    bash $DIR/countly.install_ubuntu.sh 2>&1 | tee $DIR/../log/countly-install-$DATE.log
elif [ -f /etc/redhat-release ]; then
    bash $DIR/countly.install_rhel.sh 2>&1 | tee $DIR/../log/countly-install-$DATE.log
fi