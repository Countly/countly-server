#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage (){
    echo "";
    echo "countly apidocs usage:";
    echo "    countly apidocs generate # regenerate documentation";
} 
if [ -z "$1" ]
then
    usage ;
elif [ "$1" = "generate" ]; then
    echo 'yes'
    echo "$DIR/../../../../plugins/"
    "$DIR/../../../node_modules/.bin/apidoc" -c "$DIR/../../../apidoc.json" -f "api/.*\\.js$" -i "$DIR/../../../plugins/" -o "$DIR/../../../frontend/express/public/apidoc/" -t "$DIR/../../../node_modules/apidoc-template/template/";
fi
