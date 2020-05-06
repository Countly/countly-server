#!/bin/bash

countly_start () {
    sudo launchctl start com.countly.api
    sudo launchctl start com.countly.dashboard
}

countly_stop () { 
    sudo launchctl stop com.countly.dashboard
    sudo launchctl stop com.countly.api
}

countly_restart () {
    countly_stop
    countly_start
}

countly_status () { 
    sudo launchctl list | grep com.countly.api
    sudo launchctl list | grep com.countly.dashboard
}
