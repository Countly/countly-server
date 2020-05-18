#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
usage (){
    echo "";
    echo "countly remove_user <username>";
}

if [ -z "$1" ] && [ -z "$2" ]
then
    usage ;
else
    if [[ $EUID -ne 0 ]]; then
        echo "This command must be run as root"
        exit 1
    fi

    if [ -z "$2" ]
    then
        read -srp "Enter password: " password
        echo ""
    else
        password=$2
    fi

    nodejs "$DIR/user_mgmt.js" delete "$1" "$password" ;
fi