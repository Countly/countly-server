#!/bin/bash

#get current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#get countly directory
COUNTLY_DIR="$(countly dir)"

#stop countly
countly stop

#backup old supervisor configuration file
if [ ! -f "$COUNTLY_DIR/bin/config/supervisord.conf.backup" ]; then
    mv "$COUNTLY_DIR/bin/config/supervisord.conf" "$COUNTLY_DIR/bin/config/supervisord.conf.backup"
fi

#copy new supervisord configuration file
# shellcheck disable=SC2216
yes | cp -rf "$DIR/supervisort.wuser.conf" "$COUNTLY_DIR/bin/config/supervisord.conf"

#check if user not created yet
if [ "$(getent passwd countly)x" == 'x' ]; then
    
    #create countly user
    useradd -r -M -U -d "$COUNTLY_DIR" -s /bin/false countly
    
    #countly process should be able to restart itself
    echo "countly ALL=(ALL) NOPASSWD: /usr/bin/countly start, /usr/bin/countly stop, /usr/bin/countly restart, /usr/bin/countly upgrade, /usr/bin/npm *" >> /etc/sudoers.d/countly
fi

#change permission of countly directory
chown -R countly:countly "$COUNTLY_DIR"

#start countly
countly start