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
VERSION="$(grep -oP 'version:\s*"\K[0-9\.]*' $DIR/../../frontend/express/version.info.js)"

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
    echo "Installing dependencies...";
    npm install ;
    echo "Preparing production files...";
    grunt dist-all;
    echo "Restarting Countly...";
    countly restart;
    )
}

countly_version (){
    echo $VERSION;
}

countly_dir (){
    echo "$( cd "$DIR/../.." && pwd )";
}

countly_test (){
    bash $DIR/scripts/countly.run.tests.sh ;
}

countly_backup (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    (mkdir -p $1 ;
    cd $1 ;
    echo "Backing up mongodb...";
    mongodump --db countly > /dev/null;
    mongodump --db countly_drill > /dev/null;
    echo "Backing up Countly configurations and files...";
    mkdir -p files/frontend/express/public/appimages ;
    mkdir -p files/frontend/express/public/userimages ;
    mkdir -p files/frontend/express/public/themes ;
    mkdir -p files/frontend/express/certificates ;
    mkdir -p files/frontend/express/public/javascripts/countly ;
    mkdir -p files/api ;
    if [ -f $DIR/../../frontend/express/config.js ]; then
        cp $DIR/../../frontend/express/config.js files/frontend/express/config.js
    fi
    if [ -f $DIR/../../frontend/express/public/javascripts/countly/countly.config.js ]; then
        cp $DIR/../../frontend/express/public/javascripts/countly/countly.config.js files/frontend/express/public/javascripts/countly/countly.config.js
    fi
    if [ -f $DIR/../../api/config.js ]; then
        cp $DIR/../../api/config.js files/api/config.js
    fi
    if [ -d $DIR/../../frontend/express/public/appimages ]; then
        cp -a $DIR/../../frontend/express/public/appimages/. files/frontend/express/public/appimages/
    fi
    if [ -d $DIR/../../frontend/express/public/userimages ]; then
        cp -a $DIR/../../frontend/express/public/userimages/. files/frontend/express/public/userimages/
    fi
    if [ -d $DIR/../../frontend/express/public/themes ]; then
        cp -a $DIR/../../frontend/express/public/themes/. files/frontend/express/public/themes/
    fi
    if [ -d $DIR/../../frontend/express/certificates ]; then
        cp -a $DIR/../../frontend/express/certificates/. files/frontend/express/certificates/
    fi
    
    for d in $DIR/../../plugins/*; do
        PLUGIN=$(basename $d);
        if [ -f $d/config.js ]; then
            mkdir -p files/plugins/$PLUGIN ;
            cp $d/config.js files/plugins/$PLUGIN/config.js ;
        fi
    done
    
    echo "Your backup is available at $(pwd $1)";
    )
}

countly_restore (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    echo "Restoring mongodb...";
    mongorestore --db countly $1/dump/countly > /dev/null;
    mongorestore --db countly_drill $1/dump/countly_drill > /dev/null;
    echo "Restoring Countly configurations and files...";
    (cd $1 ;
    mkdir -p $DIR/../../frontend/express/public/appimages ;
    mkdir -p $DIR/../../frontend/express/public/userimages ;
    mkdir -p $DIR/../../frontend/express/public/themes ;
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
    if [ -d files/frontend/express/public/appimages ]; then
        cp -a files/frontend/express/public/appimages/. $DIR/../../frontend/express/public/appimages/
    fi
    if [ -d files/frontend/express/public/userimages ]; then
        cp -a files/frontend/express/public/userimages/. $DIR/../../frontend/express/public/userimages/
    fi
    if [ -d files/frontend/express/public/themes ]; then
        cp -a files/frontend/express/public/themes/. $DIR/../../frontend/express/public/themes/
    fi
    if [ -d files/frontend/express/certificates ]; then
        cp -a files/frontend/express/certificates/. $DIR/../../frontend/express/certificates/
    fi
    
    for d in files/plugins/*; do
        PLUGIN=$(basename $d);
        if [ -f $d/config.js ]; then
            mkdir -p $DIR/../../plugins/$PLUGIN ;
            cp $d/config.js $DIR/../../plugins/$PLUGIN/config.js ;
        fi
    done
    echo "Restarting Countly...";
    countly restart;
    )
}

#load real platform/init sys file to overwrite stubs
source $DIR/enabled/countly.sh

#process command
NAME=$1;
if [ -n "$(type -t countly_$1)" ] && [ "$(type -t countly_$1)" = function ]; then
    shift;
    countly_${NAME} "$@";
elif [ -f $DIR/scripts/$NAME.sh ]; then
    shift;
    bash $DIR/scripts/$NAME.sh "$@";
else
    echo "";
    echo "countly usage:";
    echo "    countly start   # starts countly process";
    echo "    countly stop    # stops countly process";
    echo "    countly restart # restarts countly process";
    echo "    countly upgrade # standard upgrade process (install dependencies, minify files, restart countly)";
    echo "    countly version # outputs current countly version";
    echo "    countly dir     # outputs countly install directory";
    echo "    countly test    # run countly tests";
    echo "    countly backup path/to/backup # backups countly db and config files";
    echo "    countly restore path/to/backup # restores countly db and config files from provided backup";
    echo "    countly usage   # prints this out, but so as basically everything else does";
    countly plugin ;
    countly update ;
    countly config ;
    echo "";
fi