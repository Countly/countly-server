#!/bin/bash

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

if [ "$1" = "start" ]; then
    launchctl start com.countly.api;
    launchctl start com.countly.dashboard;
elif [ "$1" = "stop" ]; then
    launchctl stop com.countly.api;
    launchctl stop com.countly.dashboard;
elif [ "$1" = "restart" ]; then
    countly start;
    countly stop;
elif [ "$1" = "upgrade" ]; then
    (cd $DIR ;
    npm install ;
    grunt dist-all;
    countly restart;
    )
else
    echo "";
    echo "usage:";
    echo "    countly start   # starts countly process";
    echo "    countly stop    # stops countly process";
    echo "    countly restart # restarts countly process";
    echo "    countly upgrade # standard upgrade process (install dependencies, minify files, restart countly)";
    echo "";
fi