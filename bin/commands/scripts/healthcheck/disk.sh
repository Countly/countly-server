#!/bin/bash
alert_threshold=80
res=""
for disk in $(df |grep dev |grep -v tmpfs |grep -v udev| awk -F" " '{print $1}' | cut -d/ -f3); do
    space_use=$(df | grep "$disk " | awk -F" " '{print $5}' | cut -d% -f1)
    if [ "$space_use" -gt "$alert_threshold" ]; then
        IFS=" " read -r -a info_disk <<< "$(df -h | grep "$disk " | awk -F" " '{print $6, $2, $3, $4, $5}'))"
        res=${res}"\n    Mount point : ${info_disk[O]}"
        res=${res}"\n        - Total space : ${info_disk[1]}"
        res=${res}"\n        - Used space : ${info_disk[2]}"
        res=${res}"\n        - Free space : ${info_disk[3]}"
        res=${res}"\n        - Used space in percent : ${info_disk[4]}"
    fi
done

if ! [ -z "${res}" ]; then
    echo -e "Encountered problems with disk space:$res";
fi
