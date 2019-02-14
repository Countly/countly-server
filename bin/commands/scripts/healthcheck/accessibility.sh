#!/bin/bash
status=""
wget -q -t 1 --timeout=10 127.0.0.1:6001/ping
if [ $? -ne 0 ]; then
    status=${status}"\n    Dashboard is not accessible";
fi

wget -q -t 1 --timeout=10 127.0.0.1:3001/o/ping
if [ $? -ne 0 ]; then
    status=${status}"\n    Api is not accessible";
fi

wget -q -t 1 --timeout=10 127.0.0.1/ping
if [ $? -ne 0 ]; then
    status=${status}"\n    Dashboard is not accessible through Nginx";
fi

wget -q -t 1 --timeout=10 127.0.0.1/o/ping
if [ $? -ne 0 ]; then
    status=${status}"\n    Api is not accessible through Nginx";
fi

if ! [ -z "${status}" ]; then
    echo -e "Encountered problems when checking accessibility:$status";
fi
