#!/bin/bash

MONGODB_CONFIG_FILE="/etc/mongod.conf"

function mongodb_configure () {
    cp "$MONGODB_CONFIG_FILE" "$MONGODB_CONFIG_FILE".bak
    INDENT_LEVEL=$(grep dbPath ${MONGODB_CONFIG_FILE} | awk -F"[ ]" '{for(i=1;i<=NF && ($i=="");i++);print i-1}')
    INDENT_STRING=$(printf ' %.0s' $(seq 1 "$INDENT_LEVEL"))

    sed -i "/directoryPerDB/d" ${MONGODB_CONFIG_FILE}
    sed -i "s#storage:#storage:\n${INDENT_STRING}directoryPerDB: true#g" ${MONGODB_CONFIG_FILE}

    #enable IPv6 support
    if ping -c 1 -6 localhost >> /dev/null 2>&1; then
        sed -i "/ipv6/d" ${MONGODB_CONFIG_FILE}
        sed -i "s#net:#net:\n${INDENT_STRING}ipv6: true#g" ${MONGODB_CONFIG_FILE}
        sed -i '/bindIp/ s/$/, ::1/' ${MONGODB_CONFIG_FILE}
    fi

    if grep -q "slowOpThresholdMs" "$MONGODB_CONFIG_FILE"; then
        sed -i "/slowOpThresholdMs/d" ${MONGODB_CONFIG_FILE}
        sed -i "s#operationProfiling:#operationProfiling:\n${INDENT_STRING}slowOpThresholdMs: 10000#g" ${MONGODB_CONFIG_FILE}
    else
        sed -i "/#operationProfiling/d" ${MONGODB_CONFIG_FILE}
        sed -i "\$aoperationProfiling:\n${INDENT_STRING}slowOpThresholdMs: 10000" ${MONGODB_CONFIG_FILE}
    fi

    if ! grep -q "directoryForIndexes" "$MONGODB_CONFIG_FILE"; then
        sed -i "s#storage:#storage:\n${INDENT_STRING}wiredTiger:\n${INDENT_STRING}${INDENT_STRING}engineConfig:\n${INDENT_STRING}${INDENT_STRING}${INDENT_STRING}directoryForIndexes: true#g" ${MONGODB_CONFIG_FILE}
    fi
}

function mongodb_logrotate () {
    #add mongod entry for logrotate daemon
    if [ -x "$(command -v logrotate)" ]; then
        INDENT_LEVEL=$(grep dbPath "${MONGODB_CONFIG_FILE}" | awk -F"[ ]" '{for(i=1;i<=NF && ($i=="");i++);print i-1}')
        INDENT_STRING=$(printf ' %.0s' $(seq 1 "$INDENT_LEVEL"))
        MONGODB_DATA_PATH=$(grep "dbPath" "${MONGODB_CONFIG_FILE}" | awk -F' ' '{print $2}')
        #delete if any other logRotate directive exist and add logRotate to mongod.conf
        sed -i '/logRotate/d' "$MONGODB_CONFIG_FILE"
        sed -i "s#systemLog:#systemLog:\n${INDENT_STRING}logRotate: reopen#g" "$MONGODB_CONFIG_FILE"

        if [ -f /etc/redhat-release ]; then
            cat <<'EOF' > /etc/logrotate.d/mongod
/var/log/mongodb/mongod.log {
daily
size 100M
rotate 5
missingok
notifempty
create 0600 mongod mongod
sharedscripts
postrotate
    /bin/kill -SIGUSR1 $(cat /var/lib/mongo/mongod.lock)
endscript
}
EOF

        sed -i "s#/var/lib/mongo#${MONGODB_DATA_PATH}#g" /etc/logrotate.d/mongod
        fi

        if [ -f /etc/lsb-release ]; then
            cat <<'EOF' > /etc/logrotate.d/mongod
/var/log/mongodb/mongod.log {
daily
size 100M
rotate 5
missingok
notifempty
create 0600 mongodb mongodb
sharedscripts
postrotate
    /bin/kill -SIGUSR1 $(cat /var/lib/mongodb/mongod.lock)
endscript
}
EOF

        sed -i "s#/var/lib/mongodb#${MONGODB_DATA_PATH}#g" /etc/logrotate.d/mongod
        fi

        message_ok 'Logrotate configured'
    else
        message_optional 'Command logrotate is not found, please install logrotate'
    fi
}

function disable_transparent_hugepages () {
    if [[ $(/sbin/init --version) =~ upstart ]];
	then
        if [ -f "/etc/init.d/disable-transparent-hugepages" ]; then
            message_ok "Transparent hugepages is already disabled"
        else
            cat <<'EOF' > /etc/init.d/disable-transparent-hugepages
#!/bin/sh
### BEGIN INIT INFO
# Provides:          disable-transparent-hugepages
# Required-Start:    $local_fs
# Required-Stop:
# X-Start-Before:    mongod mongodb-mms-automation-agent
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Disable Linux transparent huge pages
# Description:       Disable Linux transparent huge pages, to improve
#                    database performance.
### END INIT INFO

case $1 in
  start)
    if [ -d /sys/kernel/mm/transparent_hugepage ]; then
      thp_path=/sys/kernel/mm/transparent_hugepage
    elif [ -d /sys/kernel/mm/redhat_transparent_hugepage ]; then
      thp_path=/sys/kernel/mm/redhat_transparent_hugepage
    else
      return 0
    fi

    echo 'never' > ${thp_path}/enabled
    echo 'never' > ${thp_path}/defrag

    unset thp_path
    ;;
esac
EOF
            chmod 755 /etc/init.d/disable-transparent-hugepages
            chkconfig --add disable-transparent-hugepages
        fi
	else
        cat <<'EOF' > /etc/systemd/system/disable-transparent-huge-pages.service
[Unit]
Description=Disable Transparent Huge Pages (THP)
DefaultDependencies=no
After=sysinit.target local-fs.target
Before=mongod.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never | tee /sys/kernel/mm/transparent_hugepage/enabled > /dev/null'

[Install]
WantedBy=basic.target
EOF

        systemctl daemon-reload
        systemctl start disable-transparent-huge-pages
        systemctl enable disable-transparent-huge-pages
	fi 2> /dev/null

    message_ok "Disabled transparent hugepages"
}

function fix_mongod_service_type_and_kill_method () {
    if [[ ! $(/sbin/init --version) =~ upstart ]]; then
        SERVICE_FILE_PATH=$(systemctl status mongod | grep "loaded" | awk -F';' '{print $1}' | awk -F'(' '{print $2}')

        if grep -q "Type=" "${SERVICE_FILE_PATH}"; then
            sed -i "/Type=/d" "${SERVICE_FILE_PATH}"
        fi

        if grep -q "KillSignal=" "${SERVICE_FILE_PATH}"; then
            sed -i "/KillSignal=/d" "${SERVICE_FILE_PATH}"
        fi

        sed -i "s#\[Service\]#\[Service\]\nType=simple#g" "${SERVICE_FILE_PATH}"
        sed -i "s#\[Service\]#\[Service\]\nKillSignal=SIGINT#g" "${SERVICE_FILE_PATH}"

        systemctl daemon-reload
	fi 2> /dev/null
}

function fix_mongod_service_limits () {
    if [[ ! $(/sbin/init --version) =~ upstart ]]; then
        SERVICE_FILE_PATH=$(systemctl status mongod | grep "loaded" | awk -F';' '{print $1}' | awk -F'(' '{print $2}')

        if grep -q "LimitNPROC=" "${SERVICE_FILE_PATH}"; then
            sed -i "/LimitNPROC=/d" "${SERVICE_FILE_PATH}"
        fi

        if grep -q "LimitNOFILE=" "${SERVICE_FILE_PATH}"; then
            sed -i "/LimitNOFILE=/d" "${SERVICE_FILE_PATH}"
        fi

        sed -i "s#\[Service\]#\[Service\]\nLimitNPROC=256000#g" "${SERVICE_FILE_PATH}"
        sed -i "s#\[Service\]#\[Service\]\nLimitNOFILE=392000#g" "${SERVICE_FILE_PATH}"

        systemctl daemon-reload
	fi 2> /dev/null
}

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
    sysctl -p -q > /dev/null
}

function mongodb_check() {
    MONGODB_USER=$(grep mongod /etc/passwd | awk -F':' '{print $1}')
    MONGODB_PATH=$(grep dbPath ${MONGODB_CONFIG_FILE} | awk -F' ' '{print $2}')
    MONGODB_DISK=$(df -Th | grep "${MONGODB_PATH}" | awk -F' ' '{print $2}')

    #Check data disk for type
    if [ -z "$MONGODB_DISK" ]; then
        message_optional "Couldn't find any disk for MongoDB data"
    else
        if [ "$MONGODB_DISK" == "xfs" ]; then
            message_ok "Type of MongoDB data disk is XFS"

            #Set noatime & nodiratime for data disk
            FSTAB_ENTRY=$(grep "${MONGODB_PATH}" /etc/fstab)
            FSTAB_ENTRY_OPTIONS=$(echo "$FSTAB_ENTRY" | awk -F' ' '{print $4}')
            FSTAB_ENTRY_UPDATED=$(echo "$FSTAB_ENTRY")

            if [[ "$FSTAB_ENTRY" != *"noatime"* ]]; then
                FSTAB_ENTRY_UPDATED=$(echo "$FSTAB_ENTRY_UPDATED" | sed "s#${FSTAB_ENTRY_OPTIONS}#${FSTAB_ENTRY_OPTIONS},noatime#g")
            fi

            if [[ "$FSTAB_ENTRY" != *"nodiratime"* ]]; then
                FSTAB_ENTRY_UPDATED=$(echo "$FSTAB_ENTRY_UPDATED" | sed "s#${FSTAB_ENTRY_OPTIONS}#${FSTAB_ENTRY_OPTIONS},nodiratime#g")
            fi

            cp /etc/fstab /etc/fstab.countly.bak
            sed -i "/${MONGODB_PATH//\//\\/}/d" /etc/fstab
            sed -i "\$a${FSTAB_ENTRY_UPDATED}" /etc/fstab

            message_ok "Added disk options 'noatime' & 'nodiratime' for MongoDB data disk, need reboot"
        else
            message_warning "Data of MongoDB is on additional disk but disk's type is not XFS"
        fi
    fi

    #Check logrotation
    mongodb_logrotate

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
        message_optional "Command ldd not found"
    fi

    #Set swappiness to 1
    update_sysctl "vm.swappiness" "1"
    message_ok "Swappiness set to 1"

    #File handle security limits
    update_sysctl "fs.file-max" "392000"
    update_sysctl "kernel.pid_max" "256000"
    update_sysctl "kernel.threads-max" "256000"
    update_sysctl "vm.max_map_count" "2048000"
    update_sysctl "net.ipv4.ip_local_port_range" "1024 65535"

    message_ok "Configured file handle kernel limits"

    #Security limits for MongoDB user
    if grep -q "${MONGODB_USER}" "/etc/security/limits.conf"; then
        sed -i "/${MONGODB_USER}/d" /etc/security/limits.conf
    fi

    sed -i "\$a${MONGODB_USER} soft nproc 256000" /etc/security/limits.conf
    sed -i "\$a${MONGODB_USER} hard nproc 256000" /etc/security/limits.conf
    sed -i "\$a${MONGODB_USER} soft nofile 392000" /etc/security/limits.conf
    sed -i "\$a${MONGODB_USER} hard nofile 392000" /etc/security/limits.conf

    message_ok "Configured security limits for MongoDB user"

    #Disable transparent-hugepages
    disable_transparent_hugepages

    #Check if NTP is on
    if [ -f /etc/redhat-release ]; then
        if [ -x "$(command -v ntpstat)" ]; then
            ntpstat > /dev/null

            if [ $? -eq 1 ]; then
                message_warning "NTP is disabled"
            else
                message_ok "NTP is enabled"
            fi
        else
            message_warning "Command ntpstat not found"
        fi
    fi

    if [ -f /etc/lsb-release ]; then
        if [ -x "$(command -v timedatectl)" ]; then
            timedatectl | grep "Network time on: yes" > /dev/null
            TIMEDATECTL_OUTPUT_TYPE_1=$?

            timedatectl | grep "System clock synchronized: yes" > /dev/null
            TIMEDATECTL_OUTPUT_TYPE_2=$?

            if [[ $TIMEDATECTL_OUTPUT_TYPE_1 -eq 0 || $TIMEDATECTL_OUTPUT_TYPE_2 -eq 0 ]]; then
                message_ok "NTP is enabled"
            fi
        else
            message_warning "Command timedatectl not found"
        fi
    fi

    #change mongod systemd service type to 'simple' to prevent systemd timeout interrupt on wiredtiger's long boot
    #change how systemd will stop service
    fix_mongod_service_type_and_kill_method
    #match service system limits to mongodb user's limits
    fix_mongod_service_limits

    echo -e "\nSome of changes may need reboot!\n"
}

if [ $# -eq 0 ]; then
    #install latest mongodb
    if [ -f /etc/redhat-release ]; then
        #install latest mongodb
        CENTOS_MAJOR="$(cat /etc/redhat-release |awk -F'[^0-9]+' '{ print $2 }')"

        if [[ "$CENTOS_MAJOR" != "8" && "$CENTOS_MAJOR" != "9" ]]; then
            echo "Unsupported OS version, only support CentOS/RHEL 9 and 8"
            exit 1
        fi

        echo "[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/${CENTOS_RELEASE}/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc" > /etc/yum.repos.d/mongodb-org-6.0.repo

        yum install -y mongodb-org
    elif [ -f /etc/lsb-release ]; then
        #install latest mongodb
        UBUNTU_YEAR="$(lsb_release -sr | cut -d '.' -f 1)";

        if [[ "$UBUNTU_YEAR" != "20" && "$UBUNTU_YEAR" != "22" ]]; then
            echo "Unsupported OS version, only support Ubuntu 22, 20 and 18"
            exit 1
        fi

        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

        if [ "$UBUNTU_YEAR" == "22" ]; then
            wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb ;
            dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb ;
            rm -rf libssl1.1_1.1.1f-1ubuntu2_amd64.deb
        fi

        echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu ${UBUNTU_RELEASE}/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list ;
        apt-get update
        DEBIAN_FRONTEND="noninteractive" apt-get -y install mongodb-org || (echo "Failed to install mongodb." ; exit)
    else
        echo "Unsupported OS or version, only CentOS/RHEL 8 or 9 and Ubuntu 20 or 22."
        exit 1
    fi

    #backup config and remove configuration to prevent duplicates
    mongodb_configure

    #mongodb might need to be restarted
    systemctl restart mongod > /dev/null || echo "mongodb systemctl job does not exist"

    mongodb_check
elif [ "$1" == "check" ]; then
    mongodb_check
fi
