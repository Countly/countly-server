#!/bin/bash

#get current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COUNTLY_DIR="$( cd "$DIR"/../../ && pwd )"
#check if user not created yet
if [ "$(getent passwd countly)x" == 'x' ]; then
    #create countly user
    useradd -d "$COUNTLY_DIR" -M -U countly
    #countly process should be able to restart itself
    echo "countly ALL=(ALL) NOPASSWD:ALL" | tee -a /etc/sudoers.d/countly >/dev/null
else
    echo "Countly user already exist."
    usermod -d "$COUNTLY_DIR" countly
fi

#change permission of countly directory
sudo chown -R countly:countly "$DIR/../../."
