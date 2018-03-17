#!/bin/bash
# Ex alert_threshold=80 -> You will be alerted if your occupied space is more or equal than threshold
alert_threshold=80

i=0
for disk in `df |grep dev |grep -v tmpfs |grep -v udev| awk -F" " '{print $1}' | cut -d/ -f3`
do
space_use=`df | grep $disk | awk -F" " '{print $5}' | cut -d% -f1`
if [ "$space_use" -gt "$alert_threshold" ]
then
info_disk=(`df -h | grep $disk | awk -F" " '{print $6, $2, $3, $4, $5}'`)
echo "Mount point : ${info_disk[O]}"
echo " - Total space : ${info_disk[1]}"
echo " - Used space : ${info_disk[2]}"
echo " - Free space : ${info_disk[3]}"
echo " - Used space in percent : ${info_disk[4]}"
fi
done
