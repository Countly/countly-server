#!/bin/bash

#get current dir through symlink
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

#get current countly version
VERSION="$(grep -oP '"version":\s*"\K[0-9\.]*' $DIR/../../package.json)"

#stub commands to be overwritten
countly_start (){
    echo "start stub";
} 

countly_stop (){
    echo "stop stub";
} 

countly_restart (){
    echo "restart stub";
} 

#real commands, can also be overwritten
countly_upgrade (){ 
    (cd $DIR/../.. ;
    npm install ;
    grunt dist-all;
    countly restart;
    )
}

countly_version (){
    echo $VERSION;
}

countly_backup (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    (cd $1 ;
    mongodump --db countly > /dev/null;
    mongodump --db countly_drill > /dev/null;
    mkdir -p files/frontend/express/public/appimages ;
    mkdir -p files/frontend/express/public/userimages ;
    mkdir -p files/frontend/express/certificates ;
    mkdir -p files/frontend/express/public/javascripts/countly ;
    mkdir -p files/api ;
    cp $DIR/../../frontend/express/config.js files/frontend/express/config.js
    cp $DIR/../../frontend/express/public/javascripts/countly/countly.config.js files/frontend/express/public/javascripts/countly/countly.config.js
    cp $DIR/../../api/config.js files/api/config.js
    cp -a $DIR/../../frontend/express/public/appimages/. files/frontend/express/public/appimages/
    cp -a $DIR/../../frontend/express/public/userimages/. files/frontend/express/public/userimages/
    cp -a $DIR/../../frontend/express/certificates/. files/frontend/express/certificates/
    
    for d in $DIR/../../plugins/*; do
        PLUGIN=$(basename $d);
        if [ -f $d/config.js ]; then
            mkdir -p files/plugins/$PLUGIN ;
            cp $d/config.js files/plugins/$PLUGIN/config.js ;
        fi
    done
    )
}

countly_restore (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    mongorestore --db countly $1/dump/countly > /dev/null;
    mongorestore --db countly_drill $1/dump/countly_drill > /dev/null;
    (cd $1 ;
    mkdir -p $DIR/../../frontend/express/public/appimages ;
    mkdir -p $DIR/../../frontend/express/public/userimages ;
    mkdir -p $DIR/../../frontend/express/certificates ;
    mkdir -p $DIR/../../frontend/express/public/javascripts/countly ;
    mkdir -p $DIR/../../api ;
    if [ -f files/frontend/express/config.js ]; then
        cp files/frontend/express/config.js $DIR/../../frontend/express/config.js
    fi
    if [ -f files/frontend/express/public/javascripts/countly/countly.config.js ]; then
        cp files/frontend/express/public/javascripts/countly/countly.config.js $DIR/../../frontend/express/public/javascripts/countly/countly.config.js
    fi
    if [ -f files/api/config.js ]; then
        cp files/api/config.js $DIR/../../api/config.js
    fi
    cp -a files/frontend/express/public/appimages/. $DIR/../../frontend/express/public/appimages/ 
    cp -a files/frontend/express/public/userimages/. $DIR/../../frontend/express/public/userimages/
    cp -a files/frontend/express/certificates/. $DIR/../../frontend/express/certificates/
    
    for d in files/plugins/*; do
        PLUGIN=$(basename $d);
        if [ -f $d/config.js ]; then
            mkdir -p $DIR/../../plugins/$PLUGIN ;
            cp $d/config.js $DIR/../../plugins/$PLUGIN/config.js ;
        fi
    done
    
    countly restart;
    )
}

#load real platform/init sys file to overwrite stubs
source $DIR/enabled/countly.sh

#process command
if [ -n "$(type -t countly_$1)" ] && [ "$(type -t countly_$1)" = function ]; then
    NAME=$1;
    shift;
    countly_${NAME} "$@";
elif [ -f $DIR/scripts/$1.sh ]; then
    shift;
    bash $DIR/scripts/$1.sh "$@";
else
    echo "";
    echo "usage:";
    echo "    countly start   # starts countly process";
    echo "    countly stop    # stops countly process";
    echo "    countly restart # restarts countly process";
    echo "    countly upgrade # standard upgrade process (install dependencies, minify files, restart countly)";
    echo "    countly version # outputs current countly version";
    echo "    countly backup path/to/backup # backups countly db and config files";
    echo "    countly restore path/to/backup # restores countly db and config files from provided backup";
    echo "    countly usage   # prints this out, but so as basically everything else does";
    echo "";
fi