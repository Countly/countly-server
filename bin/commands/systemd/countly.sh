#!/bin/bash

boot_configurations () {
    LIMIT_NO_FILE=$(($(($(lscpu |grep 'CPU(s):'|head -1|awk -F' ' '{print $2}')*1000)) + 10000))
    sed -i '/LimitNOFILE/d' /etc/systemd/system/countly.service
    sed -i "s#\[Service\]#\[Service\]\nLimitNOFILE=${LIMIT_NO_FILE}#g" /etc/systemd/system/countly.service
    systemctl daemon-reload

    SERVICE_USER=$(grep 'user' "$(countly dir)/bin/config/supervisord.conf"|awk -F'=' '{print $2}')
    chown -R "$SERVICE_USER:$SERVICE_USER" "$(countly dir)"
}

countly_start () {
    countly_root ;
    boot_configurations ;
    systemctl start countly;
}

countly_stop () {
    countly_root ;
    systemctl stop countly;
}

countly_restart () {
    countly_root ;
    boot_configurations ;
    systemctl restart countly;
}

countly_status () {
    systemctl status countly;
}
