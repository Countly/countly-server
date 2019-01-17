#!/bin/bash

procowner="0"
fileowner=$(stat -c '%U' `countly dir`)
paths=$(ps -ux | grep countly)
while read line; do
    if [[ $line = *"dashboard node"* ]]; then
        procowner=$(echo ${line} | tr -s ' ' | cut -d ' ' -f 1)
        break
    fi
done <<< "$paths"
if ! [ ${procowner} == ${fileowner} ]; then
    echo -e "Permission problems:"
    echo -e "   Process owner: $procowner";
    echo -e "   Directory owner: $fileowner";
fi
