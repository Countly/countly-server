#!/bin/bash

countly_start (){
    sudo /usr/bin/sv start countly-api countly-dashboard countly-ingestor countly-aggregator countly-jobserver;
}

countly_stop (){
    sudo /usr/bin/sv stop countly-api countly-dashboard countly-ingestor countly-aggregator countly-jobserver;
}

countly_restart (){
    sudo /usr/bin/sv restart countly-api countly-dashboard countly-ingestor countly-aggregator countly-jobserver;
}

countly_status (){
    sudo /usr/bin/sv status countly-api;
    sudo /usr/bin/sv status countly-dashboard;
    sudo /usr/bin/sv status countly-ingestor;
    sudo /usr/bin/sv status countly-aggregator;
    sudo /usr/bin/sv status countly-jobserver;
}
