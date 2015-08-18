#!/bin/bash

function countly_start { 
    sudo /usr/bin/sv start countly-api countly-dashboard;
}

function countly_stop { 
    sudo /usr/bin/sv stop countly-api countly-dashboard;
}

function countly_restart {
    sudo /usr/bin/sv restart countly-api countly-dashboard;
}
