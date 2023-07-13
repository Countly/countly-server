#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#check if authentication is required
isAuth=$(mongo --eval "db.getUsers()" | grep "not auth")

#check if we have previous upgrade needed
FEATVER=$(mongo admin --eval "printjson(db.adminCommand( { getParameter: 1, featureCompatibilityVersion: 1 } ).featureCompatibilityVersion)" --quiet);
VER=$(mongod -version | grep "db version" | cut -d ' ' -f 3 | cut -d 'v' -f 2)

if [ -z "$isAuth" ] ; then
    if [ -x "$(command -v mongo)" ]; then
        if echo "$VER" | grep -q -i "3.2" ; then
            echo "Attempting to upgrade mongodb to 3.4";
            bash "$DIR/upgrade.mongo.34.sh"
            mongo admin --eval "db.adminCommand( { setFeatureCompatibilityVersion: \"3.4\" } )"
            echo "Attempting to upgrade mongodb to 3.6";
            bash "$DIR/upgrade.mongo.36.sh"
            mongo admin --eval "db.adminCommand( { setFeatureCompatibilityVersion: \"3.6\" } )"
            echo "Finished upgrading mongodb to 3.6"
        elif echo "$VER" | grep -q -i "3.4" ; then
            if echo "$FEATVER" | grep -q -i "3.2" ; then
                mongo admin --eval "db.adminCommand( { setFeatureCompatibilityVersion: \"3.4\" } )"
            fi
            echo "Attempting to upgrade mongodb to 3.6";
            bash "$DIR/upgrade.mongo.36.sh"
            mongo admin --eval "db.adminCommand( { setFeatureCompatibilityVersion: \"3.6\" } )"
            echo "Finished upgrading mongodb to 3.6"
        elif echo "$VER" | grep -q -i "3.6" ; then
            if echo "$FEATVER" | grep -q -i "3.4" ; then
                mongo admin --eval "db.adminCommand( { setFeatureCompatibilityVersion: \"3.6\" } )"
            fi
            echo "Finished upgrading mongodb to 3.6"
        else
            echo "Unsupported MongodB version $VER";
            echo "Upgrade to MongoDB 3.2 first and then run this script"
            exit 1;
        fi
    else
        echo "MongoDB is not installed, installing newest version"
        bash "$DIR/upgrade.mongo.36.sh"
        mongo admin --eval "db.adminCommand( { setFeatureCompatibilityVersion: \"3.6\" } )"
    fi
else
    echo "mongod auth is ENABLED, manual upgrade will be required"
    exit 0
fi
