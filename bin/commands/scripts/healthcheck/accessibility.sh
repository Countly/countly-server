#!/bin/bash
status=""
if ! wget -q -t 1 --timeout=10 localhost:6001/ping
then
    status=${status}"\n    Dashboard is not accessible";
fi

if ! wget -q -t 1 --timeout=10 localhost:3001/o/ping
then
    status=${status}"\n    Api is not accessible";
fi

if ! wget -q -t 1 --timeout=10 localhost/ping
then
    status=${status}"\n    Dashboard is not accessible through Nginx";
fi

if ! wget -q -t 1 --timeout=10 localhost/o/ping
then
    status=${status}"\n    Api is not accessible through Nginx";
fi

if ! [ -z "${status}" ]; then
    echo -e "Encountered problems when checking accessibility:$status";
fi
