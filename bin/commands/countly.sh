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

export LANGUAGE=C ; export LC_ALL=C ;

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

countly_status (){
    echo "status stub";
} 

countly_root (){
    if [[ $EUID -ne 0 ]]; then
        echo "This command must be run as root" 
        exit 1
    fi
}

#real commands, can also be overwritten
countly_upgrade (){ 
    countly_root ;
    (cd $DIR/../.. ;
    echo "Installing dependencies...";
    sudo npm install ;
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
    countly_root ;
    bash $DIR/scripts/countly.run.tests.sh ;
}

countly_backupfiles (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    (mkdir -p $1 ;
    cd $1 ;
    echo "Backing up Countly configurations and files...";
    mkdir -p files/extend ;
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
    if [ -d $DIR/../../extend ]; then
        cp -a $DIR/../../extend/. files/extend/
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
        if [ -d $d/extend ]; then
            mkdir -p files/plugins/$PLUGIN/extend ;
            cp -a $d/extend/. files/plugins/$PLUGIN/extend/ ;
        fi
        if [ -d $d/crashsymbols ]; then
            mkdir -p files/plugins/$PLUGIN/crashsymbols ;
            cp -a $d/crashsymbols/. files/plugins/$PLUGIN/crashsymbols/ ;
        fi
    done
    )
}

countly_backupdb (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    (mkdir -p $1 ;
    cd $1 ;
    echo "Backing up mongodb...";
    mongodump $(node $DIR/scripts/db.conf.js countly) > /dev/null;
    mongodump $(node $DIR/scripts/db.conf.js countly_drill) > /dev/null;
    )
}

countly_backup (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    countly_backupfiles "$@";
    countly_backupdb "$@";
}

countly_save (){
    if [ $# -eq 1 ]
    then
        echo "Please provide destination path";
        return 0;
    fi

    if [ $# -lt 2 ]
    then
        echo "Please provide file paths" ;
        return 0;
    fi

    if [ ! -d $2 ]
    then
        mkdir -p $2
    fi
    
    if [ -f $1 ]
    then
        match=false
        files=$(ls $2 | wc -l)
        
        if [ $files -gt 0 ]
        then
            for d in $2/*; do
                diff=$(diff $1 $d | wc -l)
                if [ $diff == 0 ]
                then
                    match=true
                    break
                fi
            done
        fi

        files=$((files+1))
        filebasename=$(basename $1)
        if [ "$match" == false ]
        then
            cp -a $1 $2/${filebasename}.backup.${files}
        fi

    else
        echo "The file does not exist"
    fi
}
        
countly_restorefiles (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    if [ -d $1/files ]; then
        echo "Restoring Countly configurations and files...";
        (cd $1 ;
        mkdir -p $DIR/../../extend ;
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
        if [ -d files/extend ]; then
            cp -a files/extend/. $DIR/../../extend/
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
            if [ -d $d/extend ]; then
                mkdir -p $DIR/../../plugins/$PLUGIN/extend ;
                cp -a $d/extend/. $DIR/../../plugins/$PLUGIN/extend/ ;
            fi
            if [ -d $d/crashsymbols ]; then
                mkdir -p $DIR/../../plugins/$PLUGIN/crashsymbols ;
                cp -a $d/crashsymbols/. $DIR/../../plugins/$PLUGIN/crashsymbols/ ;
            fi
        done
        )
        echo "Restarting Countly...";
        countly restart;
    else
        echo "No files to restore from";
    fi
}

countly_restoredb (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    if [ -d $1/dump/countly ]; then
        echo "Restoring countly database...";
        mongorestore $(node $DIR/scripts/db.conf.js countly) --batchSize=10 $1/dump/countly > /dev/null;
    else
        echo "No countly database dump to restore from";
    fi
    if [ -d $1/dump/countly_drill ]; then
        echo "Restoring countly_drill database...";
        mongorestore $(node $DIR/scripts/db.conf.js countly_drill) --batchSize=10 $1/dump/countly_drill > /dev/null;
    else
        echo "No countly_drill database dump to restore from";
    fi
}

countly_restore (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    countly_restorefiles "$@";
    countly_restoredb "$@";
}

countly_thp (){
    cp -f $DIR/../scripts/disable-transparent-hugepages /etc/init.d/disable-transparent-hugepages
    chmod 755 /etc/init.d/disable-transparent-hugepages
    update-rc.d disable-transparent-hugepages defaults
}

#load real platform/init sys file to overwrite stubs
source $DIR/enabled/countly.sh

#process command
NAME=$1;
SCRIPT=$2;
if [ -n "$(type -t countly_$1)" ] && [ "$(type -t countly_$1)" = function ]; then
    shift;
    countly_${NAME} "$@";
elif [ -f $DIR/scripts/$NAME.sh ]; then
    shift;
    bash $DIR/scripts/$NAME.sh "$@";
elif [ -d $DIR/../../plugins/$NAME ] && [ -f $DIR/../../plugins/$NAME/scripts/$SCRIPT.sh ]; then
    shift;
    shift;
    bash $DIR/../../plugins/$NAME/scripts/$SCRIPT.sh "$@";
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
    echo "    countly usage   # prints this out, but so as basically everything else does";
    echo "    countly backupfiles path/to/backup # backups countly user/config files";
    echo "    countly backupdb path/to/backup # backups countly database";
    echo "    countly backup path/to/backup # backups countly db and user/config files";
    echo "    countly restorefiles path/to/backup # restores user/config files from provided backup";
    echo "    countly restoredb path/to/backup # restores countly db from provided backup";
    echo "    countly restore path/to/backup # restores countly db and config files from provided backup";
    echo "    countly save path/to/file /path/to/destination # copies the given file to the destination if no file with same data is present at the destination";
    countly api ;
    countly plugin ;
    countly update ;
    countly config ;
    echo "";
fi
