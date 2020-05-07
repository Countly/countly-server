#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DATE=$(date +%Y-%m-%d:%H:%M:%S)
CAN_MAKE_SWAP=N
if [ ! -z "$(which free)" ]
then
	totalm=$(free -m | awk '/^Mem:/{print $2}')
	CAN_MAKE_SWAP=Y
elif [ ! -z "$(which sysctl)" -a ! -z "$(which numfmt)" ]
then
	totalm=$(sysctl hw.memsize | sed -E -e 's,^[^[:digit:]]*([[:digit:]])[^[:digit:]]*,\1,' | numfmt --to-unit=1048576)
else
	totalm=0
fi
if [ "$totalm" -lt "1800" ]; then
    echo "Countly requires at least 2Gb of RAM"
    if [ "$COUNTLY_OVERWRITE_MEM_REQUIREMENT" == "1" -a $CAN_MAKE_SWAP = Y ]; then
        echo "COUNTLY_OVERWRITE_MEM_REQUIREMENT set, running make.swap.sh"
        bash "$DIR/scripts/make.swap.sh" 2>&1 | tee "$DIR/../log/countly-install-$DATE.log"
    else
        exit 1
    fi
fi
if [ -d "/Library" -a -d "/Library/LaunchDaemons" ]; then
	bash "$DIR/countly.install_macos.sh" 2>&1 | tee "$DIR/../log/countly-install-$DATE.log"
elif [ -f "$DIR/offline_installer.sh" ]; then
    bash "$DIR/offline_installer.sh" 2>&1 | tee "$DIR/../log/countly-install-$DATE.log"
elif [ -f /etc/lsb-release ]; then
    bash "$DIR/countly.install_ubuntu.sh" 2>&1 | tee "$DIR/../log/countly-install-$DATE.log"
elif [ -f /etc/redhat-release ]; then
    bash "$DIR/countly.install_rhel.sh" 2>&1 | tee "$DIR/../log/countly-install-$DATE.log"
fi
