#!/bin/bash

countly_start (){ 
    sudo /usr/bin/sv start countly-api countly-dashboard;
}

countly_stop (){ 
    sudo /usr/bin/sv stop countly-api countly-dashboard;
}

countly_restart (){
    sudo /usr/bin/sv restart countly-api countly-dashboard;
}

countly_status (){
    sudo /usr/bin/sv status countly-api;
    sudo /usr/bin/sv status countly-dashboard;
}
