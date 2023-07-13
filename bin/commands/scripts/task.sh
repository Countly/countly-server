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
    (cd "$DIR/../../.." ; npx grunt "$1";)
fi