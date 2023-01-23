#!/bin/bash

#get current dir through symlink
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

#get current countly version
VERSION="$(grep -oP 'version:\s*"\K[0-9\.]*' "$DIR/../../frontend/express/version.info.js")"

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

run_upgrade (){
    if [[ $2 == "fs" ]]
    then
        echo "Upgrading filesystem versions: $1";
    elif [[ $2 == "db" ]]
    then
        echo "Upgrading database versions: $1";
    else
        echo "Upgrading versions: $1";
    fi
    arr=("$@");
    for i in ${1//;/ }
    do
        DATE=$(date +%Y-%m-%d:%H:%M:%S)
        if [[ $2 == "fs" ]]
        then
            if [ -f "$DIR/../upgrade/$i/upgrade_fs.sh" ]; then
                if [[ " ${arr[*]} " != *" -y "* ]]; then
                    echo "Upgrading filesystem for $i. y/n?";
                    read -r choice;
                    if [ "$choice" != "y" ]; then
                        continue
                    fi
                fi
                bash "$DIR/../upgrade/$i/upgrade_fs.sh" | tee -a "$DIR/../../log/countly-upgrade-fs-$i-$DATE.log";
            else
                echo "No filesystem upgrade script provided for $i";
            fi
        elif [[ $2 == "db" ]]
        then
            if [ -f "$DIR/../upgrade/$i/upgrade_db.sh" ]; then
                if [[ " ${arr[*]} " != *" -y "* ]]; then
                    echo "Upgrading database for $i. y/n?";
                    read -r choice;
                    if [ "$choice" != "y" ]; then
                        continue
                    fi
                fi
                bash "$DIR/../upgrade/$i/upgrade_db.sh" | tee -a "$DIR/../../log/countly-upgrade-db-$i-$DATE.log";
            else
                echo "No database upgrade script provided for $i";
            fi
        else
            if [ -f "$DIR/../upgrade/$i/upgrade.sh" ]; then
                if [[ " ${arr[*]} " != *" -y "* ]]; then
                    echo "Upgrading for $i. y/n?";
                    read -r choice;
                    if [ "$choice" != "y" ]; then
                        continue
                    fi
                fi
                bash "$DIR/../upgrade/$i/upgrade.sh" combined 2>&1 | tee -a "$DIR/../../log/countly-upgrade-$i-$DATE.log";
            else
                echo "No upgrade script provided for $i";
            fi
        fi
    done
}
countly_upgrade (){
    arr=("$@");
    if [[ " ${arr[*]} " == *" -y "* ]]; then
        y="-y";
        for arg do
            shift
            [ "$arg" = "-y" ] && continue
            set -- "$@" "$arg"
        done
    fi
    countly_root ;
    if [ $# -eq 0 ]
    then
        INOFFLINEMODE=$(countly config 'api.offline_mode' | awk -F'= ' '{print $2}')

        if [ "$INOFFLINEMODE" == "false" ]
        then
            (cd "$DIR"/../..;
            echo "Installing dependencies...";
            sudo npm install;)
        fi

        (cd "$DIR/../.." ;
        echo "Preparing production files...";
        countly task dist-all;
        echo "Restarting Countly...";
        sudo countly restart;
        )
    elif [ "$1" == "auto" ]
    then
        if UPGRADE=$(nodejs "$DIR/../scripts/checking_versions.js");
        then
            run_upgrade "$UPGRADE" "$2" "$y";
        else
            echo "$UPGRADE";
        fi
    elif [ "$1" == "version" ]
    then
        if [ $# -eq 3 ] || [ $# -eq 4 ]
        then
            if [ "$2" == "fs" ] || [ "$2" == "db" ]
            then
                if UPGRADE=$(nodejs "$DIR/../scripts/checking_versions.js" "$3" "$4")
                then
                    run_upgrade "$UPGRADE" "$2" "$y";
                else
                    echo "$UPGRADE";
                fi
            elif [ $# -ge 3 ]
            then
                if UPGRADE=$(nodejs "$DIR/../scripts/checking_versions.js" "$2" "$3")
                then
                    run_upgrade "$UPGRADE" "$2" "$y";
                else
                    echo "$UPGRADE";
                fi
            fi
        else
            echo "Provide upgrade version in format:";
            echo "    countly upgrade version <from> <to>";
            echo "    countly upgrade version fs <from> <to>";
            echo "    countly upgrade version db <from> <to>";
        fi
    elif [ "$1" == "list" ]
    then
        if [ $# -eq 2 ] && [ "$2" == "auto" ]
        then
            nodejs "$DIR/../scripts/checking_versions.js";
            echo "";
        elif [ $# -eq 3 ]
        then
            nodejs "$DIR/../scripts/checking_versions.js" "$2" "$3";
            echo "";
        else
            echo "Provide upgrade version in formats:";
            echo "    countly upgrade list auto";
            echo "    countly upgrade list <from> <to>";
        fi
    elif [ "$1" == "run" ]
    then
        if [ "$2" == "fs" ] || [ "$2" == "db" ]
        then
            run_upgrade "$3" "$2" "$y";
        elif [ $# -ge 2 ]
        then
            run_upgrade "$2" upgrade "$y";
        else
            echo "Provide upgrade version in formats:";
            echo "    countly upgrade run <version>";
            echo "    countly upgrade run fs <version>";
            echo "    countly upgrade run db <version>";
        fi
    elif [ "$1" == "ee" ]
    then
        FILE=$(ls -tr "$DIR/../../../"countly-enterprise-edition*.tar.gz 2> /dev/null | tail -1 | awk -F' ' '{print $NF}')

        if [ -f "$FILE" ]; then
            tar -zxf "${FILE}" -C /tmp "countly/frontend/express/version.info.js"
            NEW_VERSION="$(grep -oP 'version:\s*"\K[0-9\.]*' "/tmp/countly/frontend/express/version.info.js")"
            rm -rf /tmp/countly

            if [ "$VERSION" == "$NEW_VERSION" ]; then
                cp -Rf "$DIR/../../"plugins/plugins.default.json "$DIR/../../"plugins/plugins.ce.json

                echo "Extracting Countly Enterprise Edition..."
                (cd "$DIR/../../../";
                tar -zxf "${FILE}";)

                EE_PLUGINS=$(sed 's/\"//g' "$DIR/../../plugins/plugins.ee.json" | sed 's/\[//g' | sed 's/\]//g')
                CE_PLUGINS=$(sed 's/\"//g' "$DIR/../../plugins/plugins.ce.json" | sed 's/\[//g' | sed 's/\]//g')
                PLUGINS_DIFF=$(echo " ${EE_PLUGINS}, ${CE_PLUGINS}" | tr ',' '\n' | sort | uniq -u)
                echo "Enabling plugins..."
                for plugin in $PLUGINS_DIFF; do
                    countly plugin enable "$plugin"
                done

                echo "Upgrading Countly..."
                countly upgrade
            else
                echo "Version mismatch detected! Version of Countly Community Edition should be the same with Enterprise Edition. Please upgrade Countly to  Community Edition v${NEW_VERSION} first."
                echo "Community Edition v${VERSION}"
                echo "Enterprise Edition v${NEW_VERSION}"
            fi
        else
            echo "Error: Couldn't find any Enterprise Edition package, you should place archive file into '$(cd "$DIR/../../../"; pwd;)'"
        fi
    elif [ "$1" == "ce" ]
    then
        FILE=$(ls -tr "$DIR/../../../"countly-community-edition*.tar.gz 2> /dev/null | tail -1 | awk -F' ' '{print $NF}')

        if [ -f "$FILE" ]; then
            tar -zxf "${FILE}" -C /tmp "countly/frontend/express/version.info.js"
            NEW_VERSION="$(grep -oP 'version:\s*"\K[0-9\.]*' "/tmp/countly/frontend/express/version.info.js")"
            rm -rf /tmp/countly

            echo -e "\e[91m\n\n                        !!!   WARNING   !!!          \n\nYou are going to downgrade from Enterprise Edition to Community Edition;\nthis will disable all Enterprise Edition plugins, delete all Enterprise\nEdition plugins and also will drop 'countly_drill' database since it contains\ndata for Enterprise Edition features.\e[0m"
            read -r -p "Are you sure you want to continue? [y/N] " response
            if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
            then
                CONTINUE=1
            fi

            if [ "$CONTINUE" == "1" ]; then
                if [ "$VERSION" == "$NEW_VERSION" ]; then
                    cp -Rf "$DIR/../../"plugins/plugins.json "$DIR/../../"plugins/plugins.ee.json

                    echo "Extracting Countly Community Edition..."
                    (cd "$DIR/../../../";
                    tar -zxf "${FILE}";)
                    bash "$DIR/../scripts/detect.init.sh"

                    CE_PLUGINS=$(sed 's/\"//g' "$DIR/../../plugins/plugins.default.json" | sed 's/\[//g' | sed 's/\]//g')
                    EE_PLUGINS=$(sed 's/\"//g' "$DIR/../../plugins/plugins.ee.json" | sed 's/\[//g' | sed 's/\]//g')
                    PLUGINS_DIFF=$(echo " ${CE_PLUGINS}, ${EE_PLUGINS}" | tr ',' '\n' | sort | uniq -u)
                    echo "Disabling plugins..."
                    for plugin in $PLUGINS_DIFF; do
                        countly plugin disable "$plugin"
                        rm -rf "$DIR/../../plugins/$plugin"
                    done

                    ## shellcheck requires variables and commands in double quote and this also add single quotes
                    ## to command, so that's why I prepared whole command as variable and provide it to bash
                    MONGO_URI="$(countly mongo)"
                    DROP_COMMAND="mongosh ${MONGO_URI} --eval 'db.getSiblingDB(\"countly_drill\").dropDatabase();'"
                    echo "Dropping 'countly_drill' database..."
                    bash -c "${DROP_COMMAND}"

                    echo "Upgrading Countly..."
                    countly upgrade
                else
                    echo "Version mismatch detected! Version of Enterprise Community Edition should be the same with Community Edition. Please upgrade Countly to  Enterprise Edition v${NEW_VERSION} first."
                    echo "Enterprise Edition v${VERSION}"
                    echo "Community Edition v${NEW_VERSION}"
                    echo -e "\nYou can run the command below & 'countly upgrade ce' again if you think core of Countly v${VERSION} is compatible to work with v${NEW_VERSION}.\nsed -i 's/version: \"${VERSION}\"/version: \"${NEW_VERSION}\"/g' $(countly dir)/frontend/express/version.info.js\n"
                fi
            fi
        else
            echo "Error: Couldn't find any Community Edition package, you should place archive file into '$(cd "$DIR/../../../"; pwd;)'"
        fi
    elif [ "$1" == "help" ]
    then
        echo "countly upgrade usage:"
        echo "    countly upgrade                                  # prepare production files and restart process";
        echo "    countly upgrade auto [-y]                        # automatically run all upgrade scripts between marked and current versions";
        echo "    countly upgrade auto fs [-y]                     # automatically run all file system upgrade scripts between marked and current versions";
        echo "    countly upgrade auto db [-y]                     # automatically run all database upgrade scripts between marked and current versions";
        echo "    countly upgrade list auto                        # list all version upgrades that will be used in auto upgrade";
        echo "    countly upgrade list <from_version> <to_version> # list all version upgrades that will be used upgrading from and to provided version";
        echo "    countly upgrade run <version> [-y]               # run specific version upgrade script";
        echo "    countly upgrade run fs <version> [-y]            # run specific version file upgrade script";
        echo "    countly upgrade run db <version> [-y]            # run specific version database script";
        echo "    countly upgrade version <from> <to> [-y]         # run all upgrade scripts between provided versions";
        echo "    countly upgrade version fs <from> <to> [-y]      # run all filesystem upgrade scripts between provided versions";
        echo "    countly upgrade version db <from> <to> [-y]      # run all database upgrade scripts between provided versions";
        echo "    countly upgrade ee                               # upgrade from Community Edition to Enterprise Edition within the same version";
        echo "    countly upgrade ce                               # upgrade from Enterprise Edition to Community Edition within the same version";
        echo "    countly upgrade help                             # this command";
    fi
}

countly_mark_version (){
    if [ "$1" == "fs" ] || [ "$1" == "db" ]
    then
        UPGRADE=$(nodejs "$DIR/../scripts/version_marks.js" write_"$1" "$2");
    elif [ "$1" == "help" ]
    then
        echo "countly mark_version usage:"
        echo "    countly mark_version fs <version> # upgrades fs version";
        echo "    countly mark_version db <version> # upgrades db version";
        echo "    countly mark_version help         # this command";
    fi
}

countly_compare_version (){
    if [ "$1" == "fs" ] || [ "$1" == "db" ]
    then
        UPGRADE=$(nodejs "$DIR/../scripts/version_marks.js" compare_"$1" "$2");
        echo "$UPGRADE";
    elif [ "$1" == "help" ]
    then
        echo "countly compare_version usage:"
        echo "    countly compare_version fs <version> # compares fs version";
        echo "    countly compare_version db <version> # compares db version";
        echo "    countly compare_version help         # this command";
    fi
}

countly_check(){

    if [ "$2" == "upgrade" ]
    then
        if [ "$1" == "before" ]
        then
            VERSION_DIFF=$(countly compare_version "$3" "$4");
            if [ "$VERSION_DIFF" == "-1" ]
            then
                echo "1" #"continue updating"
            else
                echo "0" #"up to date"
            fi
        elif [ "$1" == "after" ]
        then
            countly mark_version "$3" "$4";
        fi
    elif [ "$2" == "install" ]
    then
        if [ "$1" == "after" ]
        then
            countly mark_version fs "$VERSION";
            countly mark_version db "$VERSION";
        fi
    fi
}

countly_version (){
    echo "$VERSION";
}

countly_dir (){
    ( cd "$DIR/../.." && pwd );
}

countly_test (){
    countly_root ;
    bash "$DIR/scripts/countly.run.tests.sh" ;
}

countly_backupfiles (){
    if [ $# -eq 0 ]
    then
        echo "Please provide path" ;
        return 0;
    fi
    (mkdir -p "$1" ;
    cd "$1" ;
    echo "Backing up Countly configurations and files...";
    mkdir -p files/extend ;
    mkdir -p files/frontend/express/public/appimages ;
    mkdir -p files/frontend/express/public/userimages ;
    mkdir -p files/frontend/express/public/themes ;
    mkdir -p files/frontend/express/certificates ;
    mkdir -p files/frontend/express/public/javascripts/countly ;
    mkdir -p files/api ;
    if [ -f "$DIR/../../frontend/express/config.js" ]; then
        cp "$DIR/../../frontend/express/config.js" files/frontend/express/config.js
    fi
    if [ -f "$DIR/../../frontend/express/public/javascripts/countly/countly.config.js" ]; then
        cp "$DIR/../../frontend/express/public/javascripts/countly/countly.config.js" files/frontend/express/public/javascripts/countly/countly.config.js
    fi
    if [ -f "$DIR/../../api/config.js" ]; then
        cp "$DIR/../../api/config.js" files/api/config.js
    fi
    if [ -d "$DIR/../../extend" ]; then
        cp -a "$DIR/../../extend/." files/extend/
    fi
    if [ -d "$DIR/../../frontend/express/public/appimages" ]; then
        cp -a "$DIR/../../frontend/express/public/appimages/." files/frontend/express/public/appimages/
    fi
    if [ -d "$DIR/../../frontend/express/public/userimages" ]; then
        cp -a "$DIR/../../frontend/express/public/userimages/." files/frontend/express/public/userimages/
    fi
    if [ -d "$DIR/../../frontend/express/public/themes" ]; then
        cp -a "$DIR/../../frontend/express/public/themes/." files/frontend/express/public/themes/
    fi
    if [ -d "$DIR/../../frontend/express/certificates" ]; then
        cp -a "$DIR/../../frontend/express/certificates/." files/frontend/express/certificates/
    fi

    for d in "$DIR"/../../plugins/*; do
        PLUGIN="$(basename "$d")";
        if [ -f "$d/config.js" ]; then
            mkdir -p "files/plugins/$PLUGIN" ;
            cp "$d/config.js" "files/plugins/$PLUGIN/config.js" ;
        fi
        if [ -d "$d/extend" ]; then
            mkdir -p "files/plugins/$PLUGIN/extend" ;
            cp -a "$d/extend/." "files/plugins/$PLUGIN/extend/" ;
        fi
        if [ -d "$d/crashsymbols" ]; then
            mkdir -p "files/plugins/$PLUGIN/crashsymbols" ;
            cp -a "$d/crashsymbols/." "files/plugins/$PLUGIN/crashsymbols/" ;
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
    (mkdir -p "$1" ;
    cd "$1" ;
    echo "Backing up mongodb...";
    shift
    #allow passing custom flags
    IFS=" " read -r -a con <<< "$(node "$DIR/scripts/db.conf.js")"
    connection=( "${con[@]}"  "${@}" );
    STATUS=0

    mongodump "${connection[@]}" --db countly 2>&1 | tee "$DIR/../../log/countly-backup-$DATE.log";
    if [ "${PIPESTATUS[0]}" -ne 0 ]
    then
        STATUS=1
    fi

    mongodump "${connection[@]}" --db countly_drill 2>&1 | tee -a "$DIR/../../log/countly-backup-$DATE.log";
    if [ "${PIPESTATUS[0]}" -ne 0 ]
    then
        STATUS=1
    fi

    mongodump "${connection[@]}" --db countly_fs 2>&1 | tee -a "$DIR/../../log/countly-backup-$DATE.log";
    if [ "${PIPESTATUS[0]}" -ne 0 ]
    then
        STATUS=1
    fi

    mongodump "${connection[@]}" --db countly_out 2>&1 | tee -a "$DIR/../../log/countly-backup-$DATE.log";
    if [ "${PIPESTATUS[0]}" -ne 0 ]
    then
        STATUS=1
    fi

    exit $STATUS;
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

    if [ ! -d "$2" ]
    then
        mkdir -p "$2"
    fi

    if [ -f "$1" ]
    then
        match=false
        files=$(find "$2" -maxdepth 1 -type f -printf x | wc -c)

        if [ "$files" -gt 0 ]
        then
            for d in "$2"/*; do
                diff=$(diff "$1" "$d" | wc -l)
                if [ "$diff" == 0 ]
                then
                    match=true
                    break
                fi
            done
        fi

        files=$((files+1))
        filebasename=$(basename "$1")
        if [ "$match" == false ]
        then
            cp -a "$1" "$2/${filebasename}.backup.${files}"
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
    if [ -d "$1/files" ]; then
        echo "Restoring Countly configurations and files...";
        (cd "$1" ;
        mkdir -p "$DIR/../../extend" ;
        mkdir -p "$DIR/../../frontend/express/public/appimages" ;
        mkdir -p "$DIR/../../frontend/express/public/userimages" ;
        mkdir -p "$DIR/../../frontend/express/public/themes" ;
        mkdir -p "$DIR/../../frontend/express/certificates" ;
        mkdir -p "$DIR/../../frontend/express/public/javascripts/countly" ;
        mkdir -p "$DIR/../../api" ;
        if [ -f files/frontend/express/config.js ]; then
            cp files/frontend/express/config.js "$DIR/../../frontend/express/config.js"
        fi
        if [ -f files/frontend/express/public/javascripts/countly/countly.config.js ]; then
            cp files/frontend/express/public/javascripts/countly/countly.config.js "$DIR/../../frontend/express/public/javascripts/countly/countly.config.js"
        fi
        if [ -f files/api/config.js ]; then
            cp files/api/config.js "$DIR/../../api/config.js"
        fi
        if [ -d files/extend ]; then
            cp -a files/extend/. "$DIR/../../extend/"
        fi
        if [ -d files/frontend/express/public/appimages ]; then
            cp -a files/frontend/express/public/appimages/. "$DIR/../../frontend/express/public/appimages/"
        fi
        if [ -d files/frontend/express/public/userimages ]; then
            cp -a files/frontend/express/public/userimages/. "$DIR/../../frontend/express/public/userimages/"
        fi
        if [ -d files/frontend/express/public/themes ]; then
            cp -a files/frontend/express/public/themes/. "$DIR/../../frontend/express/public/themes/"
        fi
        if [ -d files/frontend/express/certificates ]; then
            cp -a files/frontend/express/certificates/. "$DIR/../../frontend/express/certificates/"
        fi

        for d in files/plugins/*; do
            PLUGIN=$(basename "$d");
            if [ -f "$d/config.js" ]; then
                mkdir -p "$DIR/../../plugins/$PLUGIN" ;
                cp "$d/config.js" "$DIR/../../plugins/$PLUGIN/config.js" ;
            fi
            if [ -d "$d/extend" ]; then
                mkdir -p "$DIR/../../plugins/$PLUGIN/extend" ;
                cp -a "$d/extend/." "$DIR/../../plugins/$PLUGIN/extend/" ;
            fi
            if [ -d "$d/crashsymbols" ]; then
                mkdir -p "$DIR/../../plugins/$PLUGIN/crashsymbols" ;
                cp -a "$d/crashsymbols/." "$DIR/../../plugins/$PLUGIN/crashsymbols/" ;
            fi
        done
        )
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
    CLY_EXPORT_PATH=$1
    shift
    #allow passing custom flags
    IFS=" " read -r -a con <<< "$(node "$DIR/scripts/db.conf.js")"
    connection=( "${con[@]}"  "${@}" );
    STATUS=0

    if [ -d "$CLY_EXPORT_PATH/dump/countly" ]; then
        echo "Restoring countly database...";
        mongorestore "${connection[@]}" --db countly --batchSize=10 "$CLY_EXPORT_PATH/dump/countly" 2>&1 | tee "$DIR/../../log/countly-restore-$DATE.log";
        if [ "${PIPESTATUS[0]}" -ne 0 ]
        then
            STATUS=1
        fi
    else
        echo "No countly database dump to restore from";
    fi

    if [ -d "$CLY_EXPORT_PATH/dump/countly_drill" ]; then
        echo "Restoring countly_drill database...";
        mongorestore "${connection[@]}" --db countly_drill --batchSize=10 "$CLY_EXPORT_PATH/dump/countly_drill" 2>&1 | tee -a "$DIR/../../log/countly-restore-$DATE.log";
        if [ "${PIPESTATUS[0]}" -ne 0 ]
        then
            STATUS=1
        fi
    else
        echo "No countly_drill database dump to restore from";
    fi

    if [ -d "$CLY_EXPORT_PATH/dump/countly_fs" ]; then
        echo "Restoring countly_fs database...";
        mongorestore "${connection[@]}" --db countly_fs --batchSize=10 "$CLY_EXPORT_PATH/dump/countly_fs" 2>&1 | tee -a "$DIR/../../log/countly-restore-$DATE.log";
        if [ "${PIPESTATUS[0]}" -ne 0 ]
        then
            STATUS=1
        fi
    else
        echo "No countly_fs database dump to restore from";
    fi

    if [ -d "$CLY_EXPORT_PATH/dump/countly_out" ]; then
        echo "Restoring countly_out database...";
        mongorestore "${connection[@]}" --db countly_out --batchSize=10 "$CLY_EXPORT_PATH/dump/countly_out" 2>&1 | tee -a "$DIR/../../log/countly-restore-$DATE.log";
        if [ "${PIPESTATUS[0]}" -ne 0 ]
        then
            STATUS=1
        fi
    else
        echo "No countly_out database dump to restore from";
    fi

    exit $STATUS;
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

#load real platform/init sys file to overwrite stubs
# shellcheck source=/dev/null
source "$DIR/enabled/countly.sh"

#process command
NAME="$1";
SCRIPT="$2";
if [ -n "$(type -t "countly_$1")" ] && [ "$(type -t "countly_$1")" = function ]; then
    shift;
    "countly_${NAME}" "$@";
elif [ -f "$DIR/scripts/$NAME.sh" ]; then
    shift;
    bash "$DIR/scripts/$NAME.sh" "$@";
elif [ -f "$DIR/scripts/$NAME.js" ]; then
    shift;
    nodejs "$DIR/scripts/$NAME.js" "$@";
elif [ -d "$DIR/../../plugins/$NAME" ] && [ -f "$DIR/../../plugins/$NAME/scripts/$SCRIPT.sh" ]; then
    shift;
    shift;
    bash "$DIR/../../plugins/$NAME/scripts/$SCRIPT.sh" "$@";
elif [ -d "$DIR/../../plugins/$NAME" ] && [ -f "$DIR/../../plugins/$NAME/scripts/$SCRIPT.js" ]; then
    shift;
    shift;
    nodejs "$DIR/../../plugins/$NAME/scripts/$SCRIPT.js" "$@";
elif [ -d "$DIR/../../plugins/$NAME" ] && [ -f "$DIR/../../plugins/$NAME/scripts/$NAME.sh" ]; then
    shift;
    bash "$DIR/../../plugins/$NAME/scripts/$NAME.sh" "$@";
elif [ -d "$DIR/../../plugins/$NAME" ] && [ -f "$DIR/../../plugins/$NAME/scripts/$NAME.js" ]; then
    shift;
    nodejs "$DIR/../../plugins/$NAME/scripts/$NAME.js" "$@";
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
    echo "    countly mark_version # updates current version info (for db and fs, separately)"
    echo "    countly compare_version # compares given version to installed version, returns 1 if installed is new (for db and fs, separately)"
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
    countly upgrade help ;
    countly block ;
    echo "";
fi
