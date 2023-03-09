#!/bin/bash

echo "Running filesystem modifications"

VER="22.03"

CONTINUE="$(countly check before upgrade fs "$VER")"

if [ "$CONTINUE" != "1" ] && [ "$1" != "combined" ]
then
    echo "Filesystem is already up to date with $VER"
    read -r -p "Are you sure you want to run this script? [y/N] " response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
    then
        CONTINUE=1
    fi
fi

if [ "$CONTINUE" == "1" ]
then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
    CUR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    if [[ -f /usr/local/bin/npm && -f /usr/bin/npm ]]; then
        rm /usr/local/bin/npm
        ln -s /usr/bin/npm /usr/local/bin/npm
    fi

    #upgrade files
    bash "$CUR/puppeteer.sh"

    #enable command line
    bash "$DIR/scripts/detect.init.sh"

    #removing files
    bash "$CUR/scripts/remove_old_files.sh"
    mv "$DIR/../frontend/express/public/javascripts/countly/countly.config.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.backup.20.11.js"
    cp -n "$DIR/../frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/../frontend/express/public/javascripts/countly/countly.config.js"
    rm -f "$DIR/../frontend/express/public/robots.txt"

# Checking GCC version and Installing it to match the compatibility version
GCC_VERSION_CURRENT="$(gcc -dumpversion)"
REQ_GCC_VERSION="8.0.0"
if [ "$(printf '%s\n' "$REQ_GCC_VERSION" "$GCC_VERSION_CURRENT" | sort -V | head -n1)" = "$REQ_GCC_VERSION" ]; then
    echo "Greater than or equal to ${REQ_GCC_VERSION}"
else
    echo "Less than ${REQ_GCC_VERSION}"
    if [ -f /etc/redhat-release ]; then
        if grep -i "release 8" /etc/redhat-release; then
            echo " Upgrading GCC in RHEL 8"
            dnf -y group install "Development Tools"
        else grep -i "release 7" /etc/redhat-release;
            echo " Upgrading GCC in RHEL 7"
            yum update -y
            yum install centos-release-scl -y
            yum group install -y "Development Tools"
            yum install devtoolset-8 -y
            yum install devtoolset-8-gcc* -y
            #shellcheck source=/dev/null
            source /opt/rh/devtoolset-8/enable
        fi
    fi
    if [ -f /etc/lsb-release ]; then
        echo " Upgrading GCC in Ubuntu"
        apt-get install -y  software-properties-common
        add-apt-repository ppa:ubuntu-toolchain-r/test -y
        apt-get install -y  build-essential gcc-8
        update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 8
        update-alternatives --set gcc "/usr/bin/gcc-8"
    fi
fi

# Checking G++ version and Installing it to match the compatibility version
GPP_VERSION_CURRENT="$(g++ -dumpversion)"
REQ_GPP_VERSION="8.0.0"
if [ "$(printf '%s\n' "$REQ_GPP_VERSION" "$GPP_VERSION_CURRENT" | sort -V | head -n1)" = "$REQ_GPP_VERSION" ]; then
    echo "Greater than or equal to ${REQ_GPP_VERSION}"
else
    echo "Less than ${REQ_GPP_VERSION}"
    if [ -f /etc/redhat-release ]; then
        if grep -i "release 8" /etc/redhat-release ; then
            echo " Upgrading G++ in RHEL 8"
            dnf -y group install "Development Tools"
        else grep -i "release 7" /etc/redhat-release ;
            echo " Upgrading G++ in RHEL 7"
            yum update -y
            yum install centos-release-scl -y
            yum group install -y "Development Tools"
            yum install devtoolset-8 -y
            yum install devtoolset-8-gcc* -y
            #shellcheck source=/dev/null
            source /opt/rh/devtoolset-8/enable
        fi
    fi
    if [ -f /etc/lsb-release ]; then
        echo " Upgrading G++ in Ubuntu"
        apt-get install -y  software-properties-common
        add-apt-repository ppa:ubuntu-toolchain-r/test -y
        apt-get install -y  build-essential g++-8
        update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-8 8
        update-alternatives --set g++ "/usr/bin/g++-8"
    fi
fi

    (cd "$DIR/.." && sudo npm install --unsafe-perm && sudo npm install argon2 --build-from-source)

    #upgrade plugins
    countly plugin upgrade white-labeling
    countly plugin upgrade sources
    countly plugin upgrade two-factor-auth
    countly plugin upgrade web
    countly plugin upgrade push
    countly plugin upgrade hooks


    #enable new plugins
    countly plugin enable data-manager
    countly plugin enable heatmaps

    #disable old plugins
    countly plugin disable EChartMap
    countly plugin disable restrict
    countly plugin disable assistant

    #get web sdk
    countly update sdk-web

    #install dependencies, process files and restart countly
    if [ "$1" != "combined" ]; then
        countly upgrade;
    else
        countly task dist-all;
    fi

    #call after check
    countly check after upgrade fs "$VER"
elif [ "$CONTINUE" == "0" ]
then
    echo "Filesystem is already upgraded to $VER"
elif [ "$CONTINUE" == "-1" ]
then
    echo "Filesystem is upgraded to higher version"
else
    echo "Unknown ugprade state: $CONTINUE"
fi