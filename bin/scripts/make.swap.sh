#!/bin/bash

# This helper script creates a 4 GB swap file on /swapfile, activates it, 
# and writes to /etc/fstab so that swap is enabled each time your instance is rebooted.
# Run it if your instance has a small memory (e.g less than 2GB) so it doesn't 
# go out of RAM.

#create file
if hash fallocate 2>/dev/null; then
    fallocate -l 4G /swapfile
else
    dd if=/dev/zero of=/swapfile bs=1G count=4
fi
chmod 600 /swapfile

#make file a swap file
mkswap /swapfile
swapon /swapfile

#persist swap file
echo "/swapfile   none    swap    sw    0   0" >> /etc/fstab

#set swappiness
sysctl vm.swappiness=60
echo "vm.swappiness=60" >> /etc/sysctl.conf

#set cache pressure
sysctl vm.vfs_cache_pressure=50
echo "vm.vfs_cache_pressure = 50" >> /etc/sysctl.conf
