#!/bin/bash

countly_start (){ 
    countly_root ;
    start countly-supervisor;
} 

countly_stop (){ 
    countly_root ;
    stop countly-supervisor;
} 

countly_restart (){ 
    countly_root ;
    restart countly-supervisor;
} 

countly_status (){ 
    status countly-supervisor;
} 