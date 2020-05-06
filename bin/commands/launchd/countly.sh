#!/bin/bash

countly_start () {
	if [ $EUID != 0 ];
	then
		echo "Must be run as root"
		exit 1
	fi
    launchctl start com.countly.api;
    launchctl start com.countly.dashboard;
}

countly_stop () { 
	if [ $EUID != 0 ];
	then
		echo "Must be run as root"
		exit 1
	fi
    launchctl stop com.countly.api;
    launchctl stop com.countly.dashboard;
}

countly_restart () {
	if [ $EUID != 0 ];
	then
		echo "Must be run as root"
		exit 1
	fi
    countly start;
    countly stop;
}

countly_status () { 
	if [ $EUID != 0 ];
	then
		echo "Must be run as root"
		exit 1
	fi
    launchctl list | grep com.countly.api;
    launchctl list | grep com.countly.dashboard;
}