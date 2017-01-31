#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly docs usage:";
    echo "    countly docs generate # regenerate documentation";
} 
if [ -z "$1" ]
then
    usage ;
elif [ "$1" = "generate" ]; then
    $DIR/../../../node_modules/.bin/jsdoc $DIR/../../../frontend/express/public/javascripts/countly $DIR/../../../frontend/express/public/javascripts/pre-login.js $DIR/../../../frontend/express/views/dashboard.html -R $DIR/../../../README.md -c  $DIR/../../../jsdoc_conf.json -d  $DIR/../../../docs/browser ;
    $DIR/../../../node_modules/.bin/jsdoc $DIR/../../../api -R $DIR/../../../README.md -c  $DIR/../../../jsdoc_conf.json -d  $DIR/../../../docs/api ;
fi