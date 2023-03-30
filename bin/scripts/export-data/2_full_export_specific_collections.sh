#!/bin/bash


#  Export all mongodb data for some specific collections with prefix
#  Server: mongodb or any server with mongotools installed with mongoexport command
#  Path: any
#  Command: bash 2_full_export_specific_collections.sh


#connection string without database
connection_string="mongodb://localhost"

#prefix of collection
prefix="app_users"

#database which to export, countly has data in 2 database countly and countly_drill
db="countly"

#output where to store the exported files
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
    mongoexport --uri="${connection_string}" -d "$db" -c "$c" -o "$out_dir/${db}_${c}.json"
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
    mongoexport --uri="${connection_string}" -d "$db" -c "$c" -o "$out_dir/${db}_${c}.json"
done
rm $tmp_file