#!/bin/bash

#check if user not created yet
if [ `getent passwd countly`x == 'x' ]; then
    #get current directory
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    #get countly directory
    COUNTLY_DIR="$(countly dir)"
    
    #stop countly
    countly stop
    
    #backup old supervisor configuration file
    mv $COUNTLY_DIR/bin/config/supervisord.conf $COUNTLY_DIR/bin/config/supervisord.conf.backup
    
    #copy new supervisord configuration file
    mv $DIR/supervisort.wuser.conf $COUNTLY_DIR/bin/config/supervisord.conf
    
    #create countly user
    useradd -r -M -U -d $COUNTLY_DIR -s /bin/false countly
    
    #change permission of countly directory
    chown -R countly:countly $COUNTLY_DIR
    
    #countly process should be able to restart itself
    echo "countly ALL=(ALL) NOPASSWD: /usr/bin/countly start, /usr/bin/countly stop, /usr/bin/countly restart, /usr/bin/countly upgrade" >> /etc/sudoers.d/countly
    
    #start countly
    countly start
fi