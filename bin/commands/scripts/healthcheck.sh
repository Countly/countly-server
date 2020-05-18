#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "$1" = "all" ]; then
    for d in "$DIR"/healthcheck/* ; do
        name=$(basename "$d");
        ext="${name##*.}";
        if [ "$ext" == "sh" ]; then
            bash "$DIR/healthcheck/${name::-3}.sh"
        fi
    done
elif ! [ $# -eq 0 ]; then
    for var in "$@"; do
        if [ -f "$DIR/healthcheck/$var.sh" ]; then
            bash "$DIR/healthcheck/$var.sh"
        fi
    done
else
    scripts=""
    for d in "$DIR"/healthcheck/* ; do
        name=$(basename "$d");
        ext="${name##*.}";
        if [ "$ext" == "sh" ]; then
            scripts=${scripts}${name::-3}" "
        fi
    done
    echo "Please provide flag for what information to check: all $scripts" ;
fi


