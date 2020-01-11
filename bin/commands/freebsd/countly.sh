#!/usr/bin/env bash

countly_start () { 
    service countly_api start
    service countly_dashboard start
}

countly_stop () { 
    service countly_api stop
    service countly_dashboard stop
}

countly_restart () {
    service countly_api restart
    service countly_dashboard restart
}

countly_status () { 
    service countly_api status
    service countly_dashboard status
}
