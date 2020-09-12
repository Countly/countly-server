#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
usage (){
    echo "";
    echo "countly add_user <username>";
}

if [ -z "$1" ]
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
        read -srp "Enter password again: " password_confirmation
        echo ""

        if [ "$password" != "$password_confirmation" ]
        then
            echo "Passwords doesn't match!"
            exit 1
        fi
    else
        password=$2
    fi

    nodejs "$DIR/user_mgmt.js" register "$1" "$password" ;
fi