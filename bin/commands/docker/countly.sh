#!/bin/bash
countly_start () {
    if [ "$COUNTLY_SERVICE_NAME" = "frontend" ]; then
        node frontend/express/app.js
    elif [ "$COUNTLY_SERVICE_NAME" = "api" ]; then
        node api/api.js
    else
        echo "Please define a valid value in the COUNTLY_SERVICE_NAME environment variable."
    fi
}

countly_stop () {
    echo "Please use docker to stop countly."
}

countly_restart () {
    echo "Please use docker to restart countly."
}

countly_status () {
    echo "Please use docker to get the status of countly."
}
