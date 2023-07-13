#!/bin/bash

#  Incremental export, that can be run periodically to export only new data. Exports latest updated users and new drill events
#  Server: mongodb or any server with mongotools installed with mongoexport command
#  Path: any
#  Command: bash 3_incremental_export_specific_collections.sh

#connection string without database
connection_string="mongodb://localhost"

#how many seconds back data should be exported, for example if you want to export data for last 24 horus, it would be 86400 seconds (24*60*60)
seconds=86400





timestamp="$(date +"%s")"
start_timestamp=$((timestamp-seconds))
start_date="$(date -u +'%Y-%m-%dT%H:%M:%S+0000' -d @${start_timestamp})"
prefix="app_users"
db="countly"
out_dir="./output"

if [ ! $out_dir ]; then
        out_dir="./"
else
        mkdir -p $out_dir
fi

tmp_file="fadlfhsdofheinwvw.js"
echo "print('_ ' + db.getCollectionNames().filter(function(c){return c.indexOf(\"${prefix}\") === 0}))" > $tmp_file
cols=$(mongosh "${connection_string}/${db}" $tmp_file | grep '_' | awk '{print $2}' | tr ',' ' ')
for c in $cols
do
    mongoexport --uri="${connection_string}" -d "$db" -c "$c" -o "$out_dir/${db}_${c}.json" --query "{\"last_sync\":{\"\$gte\":${start_timestamp}}}"
done
rm $tmp_file


prefix="drill_events"
db="countly_drill"
out_dir="./output"

if [ ! $out_dir ]; then
        out_dir="./"
else
        mkdir -p $out_dir
fi

tmp_file="fadlfhsdofheinwvw.js"
echo "print('_ ' + db.getCollectionNames().filter(function(c){return c.indexOf(\"${prefix}\") === 0}))" > $tmp_file
cols=$(mongosh "${connection_string}/${db}" $tmp_file | grep '_' | awk '{print $2}' | tr ',' ' ')
for c in $cols
do
    mongoexport --uri="${connection_string}" -d "$db" -c "$c" -o "$out_dir/${db}_${c}.json" --query "{\"cd\":{\"\$gte\":{\"\$date\": \"${start_date}\"}}}"
done
rm $tmp_file