#!/bin/bash

echo "Countly version : $(countly version)";
echo "Countly path    : $(countly dir)";
status=$(countly status)
if (( $(grep -c . <<<"$status") > 1 )); then
    status=$(echo "${status}" | grep "Active: " | sed -e 's/^[[:space:]]*//')
    if ! [ -z "${status}" ]; then
        echo "Countly status  : $status"
    else
        echo "Countly status  : $(countly status)";
    fi
else
    echo "Countly status  : $status";
fi
