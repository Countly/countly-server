#!/bin/bash

#get current dir through symlink
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

#stub commands to be overwritten
function countly_start { } 

function countly_stop { } 

function countly_restart { } 

#real commands, can also be overwritten
function countly_upgrade { 
    (cd $DIR/../.. ;
    npm install ;
    grunt dist-all;
    countly restart;
    )
}

#load real platform/init sys file to overwrite stubs
source $DIR/enabled/countly.sh

#process command
if [ "$1" = "start" ]; then
    countly_start;
elif [ "$1" = "stop" ]; then
    countly_stop;
elif [ "$1" = "restart" ]; then
    countly_restart;
elif [ "$1" = "upgrade" ]; then
    countly_upgrade
else
    echo "";
    echo "usage:";
    echo "    countly start   # starts countly process";
    echo "    countly stop    # stops countly process";
    echo "    countly restart # restarts countly process";
    echo "    countly upgrade # standard upgrade process (install dependencies, minify files, restart countly)";
    echo "";
fi