#!/bin/bash

function countly_start { 
    launchctl start com.countly.api;
    launchctl start com.countly.dashboard;
}

function countly_stop { 
    launchctl stop com.countly.api;
    launchctl stop com.countly.dashboard;
}

function countly_restart {
    countly start;
    countly stop;
}