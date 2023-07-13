#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
COUNTLY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
COUNTLY_DIR_NAME="$(basename "$COUNTLY_DIR")"
COUNTLY_OUT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../.." && pwd )"
COUNTLY_VERSION="$(countly version)"

countly_upgrade_pre (){
    #enable command line
    bash "$DIR/scripts/detect.init.sh"
}

countly_upgrade_post (){
    #update web-sdk
    countly update sdk-web
    
    #add indexes
    nodejs "$DIR/scripts/add_indexes.js"
    
    #install dependencies, process files and restart countly
    countly upgrade
}

countly_staging (){
    #check if there is previous staging and 
    if [ -d "$COUNTLY_OUT/staging_$COUNTLY_DIR_NAME.$COUNTLY_VERSION" ]; then
        echo "Staging already exist: $COUNTLY_OUT/staging_$COUNTLY_DIR_NAME.$COUNTLY_VERSION"
        return 0
    fi
  
    #backup current countly installation
    cp -rf "$COUNTLY_OUT/$COUNTLY_DIR_NAME" "$COUNTLY_OUT/staging_$COUNTLY_DIR_NAME.$COUNTLY_VERSION"
    
    #clean logs
    mkdir -p "$COUNTLY_DIR/log/logs.$COUNTLY_VERSION"
    mv "$COUNTLY_DIR/log/countly-api.log" "$COUNTLY_DIR/log/logs.$COUNTLY_VERSION/countly-api.log"
    mv "$COUNTLY_DIR/log/countly-dashboard.log" "$COUNTLY_DIR/log/logs.$COUNTLY_VERSION/countly-dashboard.log"
}

countly_staging_clean (){
    #clean failed upgrade if any
    if [ -d "$COUNTLY_OUT/failed_$COUNTLY_DIR_NAME.$COUNTLY_VERSION" ]; then
        rm -rf "$COUNTLY_OUT/failed_$COUNTLY_DIR_NAME.$COUNTLY_VERSION"
    fi
    
    #clean staging if any
    if [ -d "$COUNTLY_OUT/staging_$COUNTLY_DIR_NAME.$COUNTLY_VERSION" ]; then
        rm -rf "$COUNTLY_OUT/staging_$COUNTLY_DIR_NAME.$COUNTLY_VERSION"
    fi
}

countly_staging_recover (){
    #check if there is previous staging 
    if [ -d "$COUNTLY_OUT/staging_$COUNTLY_DIR_NAME.$COUNTLY_VERSION" ]; then
    
        if [ -d "$COUNTLY_OUT/failed_$COUNTLY_DIR_NAME.$COUNTLY_VERSION" ]; then
            #remove current backup if it exists
            rm -rf "$COUNTLY_OUT/failed_$COUNTLY_DIR_NAME.$COUNTLY_VERSION"
        fi
        
        #backup current upgrade attempt countly installation
        mv -rf "$COUNTLY_OUT/$COUNTLY_DIR_NAME" "$COUNTLY_OUT/failed_$COUNTLY_DIR_NAME.$COUNTLY_VERSION"
        
        #bring back staging to life
        mv -rf "$COUNTLY_OUT/staging_$COUNTLY_DIR_NAME.$COUNTLY_VERSION" "$COUNTLY_OUT/$COUNTLY_DIR_NAME"
        
        #restart process
        countly restart
    else
        echo "No staging available to recover"
    fi
}