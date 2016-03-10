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
    systemctl restart countly;
}

countly_status () {
    systemctl status countly;
}