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
    #browser code
    npx jsdoc "$DIR/../../../frontend/express/public/javascripts/countly" "$DIR/../../../frontend/express/public/javascripts/pre-login.js" -R "$DIR/../../../README.md" -c  "$DIR/../../../jsdoc_conf.json" -d "$DIR/../../../frontend/express/public/docs/browser" ;
    
    #api code
    npx jsdoc "$DIR/../../../api" -R "$DIR/../../../README.md" -c  "$DIR/../../../jsdoc_conf.json" -d  "$DIR/../../../frontend/express/public/docs/api" ;
    
    #frontend code
    npx jsdoc "$DIR/../../../frontend/express/app.js" "$DIR/../../../frontend/express/config.sample.js" "$DIR/../../../frontend/express/version.info.js" "$DIR/../../../frontend/express/locale.conf.js" "$DIR/../../../frontend/express/libs/" -R "$DIR/../../../README.md" -c  "$DIR/../../../jsdoc_conf.json" -d  "$DIR/../../../frontend/express/public/docs/app" ;
    
    #apidoc
    npx apidoc -i "$DIR/../../../" -o "$DIR/../../../frontend/express/public/docs/apidoc" -f ".*\\.js$" -e "node_modules" ;
    
    #add redirect for main folder
    echo "<html><head><meta http-equiv='Refresh' content='0; url=./api/index.html'/><script type='javascript'>window.location = './api/index,html';</script></head></html>" > "$DIR/../../../frontend/express/public/docs/index.html"
fi
