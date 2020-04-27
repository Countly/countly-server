#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
usage (){
    echo "";
    echo "countly task <taskname>";
} 

if [ -z "$1" ]
then
    usage ;
else
    (cd "$DIR/../../.." ;
        if [ -f "$DIR/../../../node_modules/grunt/bin/grunt" ]; then
            "$DIR/../../../node_modules/grunt/bin/grunt" "$1";
        else
            #fallback to global grunt command
            grunt "$1";
        fi
    )
fi