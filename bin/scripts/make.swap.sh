#!/bin/bash
set -e
# This helper script creates a 4 GB swap file on /swapfile, activates it, 
# and writes to /etc/fstab so that swap is enabled each time your instance is rebooted.
# Run it if your instance has a small memory (e.g less than 2GB) so it doesn't 
# go out of RAM.

#amount in GB
AMOUNT=${1:-4}
echo "Attempting to create $AMOUNT Gb swap file"
echo "Reserving space, may take a while"

#create file
dd if=/dev/zero of=/swapfile bs=1G count=$AMOUNT
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
