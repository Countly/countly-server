#!/bin/bash

#get current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#check if user not created yet
if [ "$(getent passwd countly)x" == 'x' ]; then

    #create countly user
    useradd -m -U countly

    #countly process should be able to restart itself
    echo "countly ALL=(ALL) NOPASSWD:ALL" | tee -a /etc/sudoers.d/countly >/dev/null
else

    echo "Countly user already exist."
fi

cp -r "$DIR/../../../countly" "/home/countly/countly"

#change permission of countly directory
sudo chown -R countly:countly "/home/countly/countly"
sudo chmod +x "/home/countly/countly/bin/countly.install_ubuntu.sh"
