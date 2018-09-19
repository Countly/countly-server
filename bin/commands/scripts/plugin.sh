#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
usage (){
    echo "";
    echo "countly plugin usage:";
    echo "    countly plugin list                   # list plugins";
    echo "    countly plugin list states            # list plugins and their states";
    echo "    countly plugin enable <pluginname>    # enables plugin";
    echo "    countly plugin disable <pluginname>   # disables plugin";
    echo "    countly plugin upgrade <pluginname>   # run plugin install script";
    echo "    countly plugin status <pluginname>    # status of plugin";
    echo "    countly plugin version <pluginname>   # version of plugin";
} 

if [ "$1" = "list" ]; then
    for d in $DIR/../../../plugins/*/; do
        if [ "$2" = "states" ]; then
            PLUGIN=$(basename $d) ;
            if grep -Fq "\"$PLUGIN\"" $DIR/../../../plugins/plugins.json
            then
                printf "  $PLUGIN =$GREEN enabled $NC\n";
            else
                printf "  $PLUGIN =$RED disabled $NC\n";
            fi
        else
            echo "  $(basename $d)";
        fi
    done
elif [ -d "$DIR/../../../plugins/$2" ]; then
    if [ "$1" = "enable" ]; then
        nodejs $DIR/plugin.js enable $2 ;
    elif [ "$1" = "disable" ]; then
        nodejs $DIR/plugin.js disable $2 ;
    elif [ "$1" = "upgrade" ]; then
        nodejs $DIR/plugin.js upgrade $2 ;
    elif [ "$1" = "status" ]; then
        if grep -Fq "\"$2\"" $DIR/../../../plugins/plugins.json
        then
            echo "enabled"
        else
            echo "disabled"
        fi
    elif [ "$1" = "version" ]; then
        echo "$(grep -oP '"version":\s*"\K[0-9\.]*' $DIR/../../../plugins/$2/package.json)" ;
    elif [ "$1" = "test" ]; then
        countly task jshint;
        shift;
        nodejs $DIR/plugin.js test "$@" ;
    elif [ "$1" = "lint" ]; then
        if [ "$3" = "--browser" ] || [ -z $3 ]; then
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_browser.json $DIR/../../../plugins/$2/frontend/public/javascripts/countly.models.js ;
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_browser.json $DIR/../../../plugins/$2/frontend/public/javascripts/countly.views.js ;
        fi
        if [ "$3" = "--nodejs" ] || [ -z $3 ]; then
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_nodejs.json $DIR/../../../plugins/$2/api/*.js ;
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_nodejs.json $DIR/../../../plugins/$2/api/**/*.js ;
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_nodejs.json $DIR/../../../plugins/$2/frontend/*.js ;
        fi
        if [ "$3" = "--scripts" ] || [ -z $3 ]; then
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_scripts.json $DIR/../../../plugins/$2/*.js ;
            if [ -d $DIR/../../../plugins/$2/tests ]; then
                $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_scripts.json $DIR/../../../plugins/$2/tests/*.js ;
                $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_scripts.json $DIR/../../../plugins/$2/tests/**/*.js ;
            fi
        fi
    elif [ "$1" = "lintfix" ]; then
        if [ "$3" = "--browser" ] || [ -z $3 ]; then
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_browser.json $DIR/../../../plugins/$2/frontend/public/javascripts/countly.models.js --fix ;
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_browser.json $DIR/../../../plugins/$2/frontend/public/javascripts/countly.views.js --fix ;
        fi
        if [ "$3" = "--nodejs" ] || [ -z $3 ]; then
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_nodejs.json $DIR/../../../plugins/$2/api/*.js --fix ;
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_nodejs.json $DIR/../../../plugins/$2/api/**/*.js --fix ;
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_nodejs.json $DIR/../../../plugins/$2/frontend/*.js --fix ;
        fi
        if [ "$3" = "--scripts" ] || [ -z $3 ]; then
            $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_scripts.json $DIR/../../../plugins/$2/*.js --fix ;
            if [ -d $DIR/../../../plugins/$2/tests ]; then
                $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_scripts.json $DIR/../../../plugins/$2/tests/*.js --fix ;
                $DIR/../../../node_modules/eslint/bin/eslint.js -c $DIR/../../../bin/config/eslint/eslint_scripts.json $DIR/../../../plugins/$2/tests/**/*.js --fix ;
            fi
        fi
    else
        usage ;
    fi
else
    echo "Plugin $2 does not exist";
fi