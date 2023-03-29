#!/bin/bash

#drop packages coming from 0/0 going through mongodb port
#allow those coming from localhost
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s localhost -j ACCEPT
iptables -A INPUT -m state --state NEW -p tcp --destination-port 27019 -s 0/0 -j DROP

#save rules
iptables-save > /etc/iptables/rules.v4

#install iptables-persistent
apt-get install -y iptables-persistent