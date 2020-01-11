#!/usr/bin/env bash
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
    "$DIR/../../../node_modules/.bin/jsdoc" "$DIR/../../../frontend/express/public/javascripts/countly" -R "$DIR/../../../frontend/express/public/javascripts/pre-login.js" -R "$DIR/../../../README.md" -c  "$DIR/../../../jsdoc_conf.json" -d "$DIR/../../../frontend/express/public/docs/browser" ;
    "$DIR/../../../node_modules/.bin/jsdoc" "$DIR/../../../api" -R "$DIR/../../../README.md" -c  "$DIR/../../../jsdoc_conf.json" -d  "$DIR/../../../frontend/express/public/docs/api" ;
    "$DIR/../../../node_modules/.bin/jsdoc" "$DIR/../../../frontend/express/app.js" "$DIR/../../../frontend/express/config.sample.js" "$DIR/../../../frontend/express/version.info.js" "$DIR/../../../frontend/express/locale.conf.js" "$DIR/../../../frontend/express/libs/" -R "$DIR/../../../README.md" -c  "$DIR/../../../jsdoc_conf.json" -d  "$DIR/../../../frontend/express/public/docs/app" ;
fi
