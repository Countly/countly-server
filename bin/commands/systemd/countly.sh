#!/bin/bash

function countly_start { 
    systemctl start countly;
}

function countly_stop { 
    systemctl stop countly;
}

function countly_restart {
    systemctl restart countly;
}
