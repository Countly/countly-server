#!/bin/bash

countly_start () { 
    systemctl start countly;
}

countly_stop () { 
    systemctl stop countly;
}

countly_restart () {
    systemctl restart countly;
}
