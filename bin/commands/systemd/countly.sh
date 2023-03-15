#!/bin/bash

countly_start () {
    countly_root ;
    systemctl start countly;
}

countly_stop () {
    countly_root ;
    systemctl stop countly;
}

countly_restart () {
    countly_root ;
    SERVICE_USER=$(grep 'user' "$(countly dir)/bin/config/supervisord.conf"|awk -F'=' '{print $2}')
    chown -R "$SERVICE_USER:$SERVICE_USER" "$(countly dir)"
    systemctl restart countly;
}

countly_status () {
    systemctl status countly;
}