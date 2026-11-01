#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly fs usage:";
    echo "    countly fs migrate <from> <to> [concurrency] # from fs to gridfs or vice versa";
    echo "        concurrency: files uploaded to gridfs at the same time, default 2, use 1 on small hosts";
}
if [ -z "$1" ]
then
    usage ;
else
    nodejs "$DIR/fs.js" "$1" "$2" "$3" "$4";
fi