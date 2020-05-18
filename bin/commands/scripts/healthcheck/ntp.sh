#!/bin/bash

if [ -x "$(command -v ntpstat)" ]; then
    if ! ntpstat
    then
        echo -e "NTP does not seem to work properly";
    fi
elif [ -x "$(command -v ntpq)" ]; then
    ntp_offset=$(ntpq -pn | awk 'BEGIN { offset=1000 } $1 ~ /\*/ { offset=$9 } END { print offset }');
    if [ "${ntp_offset}" -gt 1000 ]; then
        echo -e "NTP does not seem to work properly";
    fi
elif [ -x "$(command -v timedatectl)" ]; then
    res=$(timedatectl status | grep 'NTP synchronized' | tr -d ' ' | cut -d ':' -f 2);
    if ! [[ "$res" == "yes" ]]; then
        echo -e "NTP does not seem to work properly";
    fi
else
    echo -e "NTP does not seem to be installed or configured correctly";
fi
