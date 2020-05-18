#!/bin/bash

#check usage
cpupercentthreshold=80
mempercentthreshold=80
cpuover=""
memover=""
top=$(top -b -n 1 | sed -e "1,7d")
while read -r line; do
    cpuutil=$(echo "${line}" | awk '{print $9}' | cut -d"." -f 1)
    memutil=$(echo "${line}" | awk '{print $10}' | cut -d"." -f 1)
    procname=$(echo "${line}" | awk '{print $12}' | cut -d"." -f 1)
    pid=$(echo "${line}" | awk '{print $1}' | cut -d"." -f 1)
    if [ "${cpuutil}" -ge "${cpupercentthreshold}" ]; then
        cpuover="${cpuover}\n    ${procname}(${pid}) - ${cpuutil}%"
    fi
    if [ "${memutil}" -ge "${mempercentthreshold}" ]; then
        memover="${memover}\n    ${procname}(${pid}) - ${memutil}%"
    fi
done <<< "$top"
if ! [ -z "${cpuover}" ]; then
    echo -e "Encountered problems with processes above CPU threshold: $cpuover"
fi
if ! [ -z "${memover}" ]; then
    echo -e "Encountered problems with processes above MEM threshold: $memover"
fi

#check process count
appprocthreshold=1
apiprocthreshold=1
workersthreshold=$(nproc)
appproc=0
apiproc=0
workers=0
# shellcheck disable=SC2009
paths=$(ps -ax | grep countly)
while read -r line; do
    if [[ "$line" = *"dashboard node"* ]]; then
        appproc=$((appproc+1))
    fi
    if [[ "$line" = *"api master node"* ]]; then
        apiproc=$((apiproc+1))
    fi
    if [[ "$line" = *"api worker node"* ]]; then
        workers=$((workers+1))
    fi
done <<< "$paths"
res=""
if [ "${appproc}" -gt "${appprocthreshold}" ]; then
    res="${res}\n    Too many processes for app.js: $appproc"
elif [ "${appproc}" == 0 ]; then
    res="${res}\n    Process app.js is not found"
fi
if [ "${apiproc}" -gt "${apiprocthreshold}" ]; then
    res="${res}\n    Too many processes for api.js: $apiproc"
elif [ "${apiproc}" == 0 ]; then
    res="${res}\n    Process api.js is not found"
fi
if [ "${workers}" -gt "${workersthreshold}" ]; then
    res="${res}\n    Too many processes for api.js workers: $workers    nproc: $workersthreshold"
elif [ "${workers}" -lt "${workersthreshold}" ]; then
    res="${res}\n    Too little processes for api.js workers: $workers    nproc: $workersthreshold"
fi

if ! [ -z "${res}" ]; then
    echo -e "Encountered problems with process count:$res";
fi
