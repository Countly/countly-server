#!/bin/bash
status=""
if ! wget -q -t 1 --timeout=10 127.0.0.1:6001/ping 
then
    status=${status}"\n    Dashboard is not accessible";
fi

if ! wget -q -t 1 --timeout=10 127.0.0.1:3001/o/ping
then
    status=${status}"\n    Api is not accessible";
fi

if ! wget -q -t 1 --timeout=10 127.0.0.1/ping
then
    status=${status}"\n    Dashboard is not accessible through Nginx";
fi

if ! wget -q -t 1 --timeout=10 127.0.0.1/o/ping
then
    status=${status}"\n    Api is not accessible through Nginx";
fi

if ! [ -z "${status}" ]; then
    echo -e "Encountered problems when checking accessibility:$status";
fi
