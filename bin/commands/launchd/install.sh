#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COUNTLY_DIR="$( cd "$DIR"/../../.. && pwd )"

# Make sure that brew is installed - we'll need it.
if [ ! -x /usr/local/bin/brew ]
then
    if [ $EUID == 0 ]
    then
        # Can't install brew as root, use SUDO_USER
        sudo -u $SUDO_USER /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
        doBrew () {
            sudo -u $SUDO_USER brew "$@"
        }
    else
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
        doBrew() {
            brew "$@"
        }
    fi
else
    if [ $EUID == 0 ]
    then
        doBrew () {
            sudo -u $SUDO_USER brew "$@"
        }
    else
        doBrew() {
            brew "$@"
        }
    fi
fi

# Make sure that mongodb is installed
MONGODB=mongodb-community@3.6
if [ -z "$(doBrew list | grep "$MONGODB")" ]
then
    # mongodb is now on its own brew tap. make sure we have it tapped.
    if [ -z "$(doBrew tap | grep mongodb/brew)" ]
    then
        brew tap mongodb/brew
    fi
    doBrew install "$MONGODB"
fi

# Make sure that mongodb is running
MONGO_RUNNING="$(sudo brew services list | grep "$MONGODB")"
if [ -z "$MONGO_RUNNING" -o "$(echo "$MONGO_RUNNING" | sed -E -e 's/^[^[:space:]]+[[:space:]]([[:alpha:]]+)[[:space:]].+$/\1/')" = "stopped" ]
then
    sudo brew services start mongodb/brew/mongodb-community@3.6
fi

# Make sure that nodeenv is installed under brew
if [ -z "$(brew list | grep nodeenv)" ]
then
    doBrew install nodeenv
fi

if [ -f /Library/LaunchDaemons/com.countly.dashboard.plist ];
then
    sudo launchctl unload /Library/LaunchDaemons/com.countly.dashboard.plist
fi
if [ -f /Library/LaunchDaemons/com.countly.api.plist ];
then
    sudo launchctl unload /Library/LaunchDaemons/com.countly.api.plist
fi

sudo cp $DIR/com.countly.api.plist /Library/LaunchDaemons/
sudo cp $DIR/com.countly.dashboard.plist /Library/LaunchDaemons/
# Point to our installation
sudo sed -E -i '' -e 's,/usr/local/countly/,'"${COUNTLY_DIR}"'/,g' /Library/LaunchDaemons/com.countly.api.plist
sudo sed -E -i '' -e 's,/usr/local/countly/,'"${COUNTLY_DIR}"'/,g' /Library/LaunchDaemons/com.countly.dashboard.plist

sudo launchctl load /Library/LaunchDaemons/com.countly.api.plist
sudo launchctl load /Library/LaunchDaemons/com.countly.dashboard.plist
