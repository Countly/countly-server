#!/bin/bash

nginxpath="/var/log/nginx/error.log"
curdate=$(date "+%Y/%m/%d %H")
errors=$(cat ${nginxpath} | grep "${curdate}" | wc -l);

if [ ${errors} -gt 0 ]; then
    echo -e "You have $errors error(s) in the last hour in your nginx error.log";
fi