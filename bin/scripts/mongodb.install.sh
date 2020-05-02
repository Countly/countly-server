#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function message_warning () {
    echo -e "\e[1m[\e[91m!\e[97m]\e[0m $1"
}

function message_optional () {
    echo -e "\e[1m[\e[93m?\e[97m]\e[0m $1"
}

function message_ok () {
    echo -e "\e[1m[\e[92m+\e[97m]\e[0m $1"
}

function update_sysctl() {
    if grep -q "${1}" "/etc/sysctl.conf"; then
        sed -i "/${1}/d" /etc/sysctl.conf
    fi

    sed -i "\$a${1} = ${2}" /etc/sysctl.conf
    sysctl -p -q
}

if [ $# -eq 0 ]; then
    if [ -f /etc/redhat-release ]; then
        #install latest mongodb

        #select source based on release
        if grep -q -i "release 6" /etc/redhat-release ; then
            echo "[mongodb-org-3.6]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/6/mongodb-org/3.6/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.6.asc" > /etc/yum.repos.d/mongodb-org-3.6.repo
        elif grep -q -i "release 7" /etc/redhat-release ; then
            echo "[mongodb-org-3.6]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/3.6/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.6.asc" > /etc/yum.repos.d/mongodb-org-3.6.repo
        fi
        yum install -y mongodb-org

        #disable transparent-hugepages (requires reboot)
        cp -f "$DIR/disable-transparent-hugepages" /etc/init.d/disable-transparent-hugepages
        chmod 755 /etc/init.d/disable-transparent-hugepages
        chkconfig --add disable-transparent-hugepages
    fi

    if [ -f /etc/lsb-release ]; then
        #install latest mongodb
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
        UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";

        if [ "$UBUNTU_YEAR" == "14" ]; then
            echo "deb [ arch=amd64 ] http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.6 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list ;
        elif [ "$UBUNTU_YEAR" == "16" ]; then
            echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list ;
        else
            echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.6.list ;
        fi
        apt-get update
        #install mongodb
        DEBIAN_FRONTEND="noninteractive" apt-get -y install mongodb-org || (echo "Failed to install mongodb." ; exit)

        #disable transparent-hugepages (requires reboot)
        cp -f "$DIR/disable-transparent-hugepages" /etc/init.d/disable-transparent-hugepages
        chmod 755 /etc/init.d/disable-transparent-hugepages
        update-rc.d disable-transparent-hugepages defaults
    fi

    #configure logrotate daemon for mongodb
    bash "$DIR/mongodb.init.logrotate.sh"

    #backup config and remove configuration to prevent duplicates
    cp /etc/mongod.conf /etc/mongod.conf.bak
    bash "$DIR/mongodb.configure.sh"

    if [ -f /etc/redhat-release ]; then
        #mongodb might need to be started
        if grep -q -i "release 6" /etc/redhat-release ; then
            service mongod restart || echo "mongodb service does not exist"
        else
            systemctl restart mongod || echo "mongodb systemctl job does not exist"
        fi
    fi

    if [ -f /etc/lsb-release ]; then
        if [[ "$(/sbin/init --version)" =~ upstart ]]; then
            restart mongod || echo "mongodb upstart job does not exist"
        else
            systemctl restart mongod || echo "mongodb systemctl job does not exist"
        fi
    fi
elif [ "$1" == "check" ]; then
    MONGO_CONFIG_FILE="/etc/mongod.conf"
    MONGO_USER=$(grep mongod /etc/passwd | awk -F':' '{print $1}')
    MONGO_PATH=$(grep dbPath ${MONGO_CONFIG_FILE} | awk -F' ' '{print $2}')
    MONGO_DISK=$(df -Th | grep "${MONGO_PATH}" | awk -F' ' '{print $2}')

    #Check data disk for type
    if [ -z "$MONGO_DISK" ]; then
        message_optional "Couldn't find any disk for MongoDB data"
    else
        if [ "$MONGO_DISK" == "xfs" ]; then
            message_ok "Type of MongoDB data disk is XFS"

            #Set noatime & nodiratime for data disk
            FSTAB_ENTRY=$(grep "${MONGO_PATH}" /etc/fstab.bak)
            FSTAB_ENTRY_OPTIONS=$(echo "$FSTAB_ENTRY" | awk -F' ' '{print $4}')
            FSTAB_ENTRY_UPDATED=$(echo "$FSTAB_ENTRY")

            if [[ "$FSTAB_ENTRY" != *"noatime"* ]]; then
                FSTAB_ENTRY_UPDATED=$(echo "$FSTAB_ENTRY_UPDATED" | sed "s#${FSTAB_ENTRY_OPTIONS}#${FSTAB_ENTRY_OPTIONS},noatime#g")
            fi

            if [[ "$FSTAB_ENTRY" != *"nodiratime"* ]]; then
                FSTAB_ENTRY_UPDATED=$(echo "$FSTAB_ENTRY_UPDATED" | sed "s#${FSTAB_ENTRY_OPTIONS}#${FSTAB_ENTRY_OPTIONS},nodiratime#g")
            fi

            sed -i "/${MONGO_PATH//\//\\/}/d" /etc/fstab.bak
            sed -i "\$a${FSTAB_ENTRY_UPDATED}" /etc/fstab.bak

            message_ok "Added disk options 'noatime' & 'nodiratime' for MongoDB data disk, need reboot"
        else
            message_warning "Data of MongoDB is on additional disk but disk's type is not XFS"
        fi
    fi

    #Check logrotation
    #bash "$DIR/mongodb.init.logrotate.sh"

    #Check kernel version 2.6.36
    KERNEL_VERSION=$(uname -r | awk -F'-' '{print $1}')
    KERNEL_VERSION_MAJOR=$(echo "${KERNEL_VERSION}" | awk -F'.' '{print $1}')
    KERNEL_VERSION_MAJOR=$((KERNEL_VERSION_MAJOR + 0))
    KERNEL_VERSION_MINOR=$(echo "${KERNEL_VERSION}" | awk -F'.' '{print $2}')
    KERNEL_VERSION_MINOR=$((KERNEL_VERSION_MINOR + 0))
    KERNEL_VERSION_PATCH=$(echo "${KERNEL_VERSION}" | awk -F'.' '{print $3}')
    KERNEL_VERSION_PATCH=$((KERNEL_VERSION_PATCH + 0))

    if [ $KERNEL_VERSION_MAJOR -gt 2 ]; then
        message_ok "Linux kernel version is OK ${KERNEL_VERSION}"
    else
        if [[ $KERNEL_VERSION_MAJOR -eq 2 && $KERNEL_VERSION_MINOR -gt 6 ]]; then
            message_ok "Linux kernel version is OK ${KERNEL_VERSION}"
        else
            if [[ $KERNEL_VERSION_MAJOR -eq 2 && $KERNEL_VERSION_MINOR -ge 6 && $KERNEL_VERSION_PATCH -ge 36 ]]; then
                message_ok "Linux kernel version is OK ${KERNEL_VERSION}"
            else
                message_warning "Linux kernel need to be updated"
            fi
        fi
    fi

    #Check glibc version 2.13
    if [ -x "$(command -v ldd)" ]; then
        LDD_VERSION=$(ldd --version | head -1 | awk -F' ' '{print $NF}')
        LDD_VERSION_MAJOR=$(echo "${LDD_VERSION}" | awk -F'.' '{print $1}')
        LDD_VERSION_MAJOR=$((LDD_VERSION_MAJOR + 0))
        LDD_VERSION_MINOR=$(echo "${LDD_VERSION}" | awk -F'.' '{print $2}')
        LDD_VERSION_MINOR=$((LDD_VERSION_MINOR + 0))

        if [ $LDD_VERSION_MAJOR -gt 2 ]; then
            message_ok "GLibC version is OK ${LDD_VERSION}"
        else
            if [[ $LDD_VERSION_MAJOR -eq 2 && $LDD_VERSION_MINOR -ge 13 ]]; then
                message_ok "GLibC version is OK ${LDD_VERSION}"
            else
                message_warning "Glibc need to be updated"
            fi
        fi
    else
        message_optional "LDD command not found"
    fi

    #Set swappiness to 1
    if grep -q "vm.swappiness" "/etc/sysctl.conf"; then
        sed -i "/vm.swappiness/d" /etc/sysctl.conf
    fi

    message_ok "Swappiness set to 1"

    #File handle security limits
    update_sysctl "fs.file-max" "392000"
    update_sysctl "kernel.pid_max" "256000"
    update_sysctl "kernel.threads-max" "256000"
    update_sysctl "vm.max_map_count" "512000"

    message_ok "Configured file handle kernel limits"

    #Security limits for MongoDB user
    if grep -q "${MONGO_USER}" "/etc/security/limits.conf"; then
        sed -i "/${MONGO_USER}/d" /etc/security/limits.conf
    fi

    sed -i "\$a${MONGO_USER} soft nproc 256000" /etc/security/limits.conf
    sed -i "\$a${MONGO_USER} hard nproc 256000" /etc/security/limits.conf
    sed -i "\$a${MONGO_USER} soft nofile 392000" /etc/security/limits.conf
    sed -i "\$a${MONGO_USER} hard nofile 392000" /etc/security/limits.conf

    message_ok "Configured security limits for MongoDB user"

    #Check numactl support & configure
    if [ -x "$(command -v numactl)" ]; then
        numactl --hardware > /dev/null

        if [ $? -eq 1 ]; then
            message_optional "NUMA is not available on this system"
        else
            NUMA_NODES=$(numactl --hardware | grep nodes | awk -F' ' '{print $2}')
            NUMA_NODES=$((NUMA_NODES + 0))

            if [ ! $NUMA_NODES -ge 2 ]; then
                message_optional "NUMA is not available on this system"
            else
                update_sysctl "vm.zone_reclaim_mode" "0"
                sed -i "s#NUMACTL_STATUS=0#NUMACTL_STATUS=1#g" "${DIR}/../commands/systemd/mongodb.sh"
                systemctl daemon-reload

                message_ok "Changed service file to work with NUMA"
            fi
        fi
    else
        message_warning "Numactl command not found"
    fi

    #Disable transparent-hugepages
    if [ -f "/etc/init.d/disable-transparent-hugepages" ]; then
        message_ok "Transparent hugepages is already disabled"
    else
        cp -f "$DIR/disable-transparent-hugepages" /etc/init.d/disable-transparent-hugepages
        chmod 755 /etc/init.d/disable-transparent-hugepages
        chkconfig --add disable-transparent-hugepages

        message_ok "Disabled transparent hugepages"
    fi

    echo -e "\nSome of changes may need reboot!\n"
fi
