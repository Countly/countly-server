#!/bin/bash

#  Creates needed indexes for incremental exports
#  Server: mongodb or any server with mongotools installed with mongoexport command
#  Path: any
#  Command: bash 4_create_incremental_indexes.sh

#connection string without database
connection_string="mongodb://localhost"



prefix="app_users"
db="countly"
tmp_file="fadlfhsdofheinwvw.js"
echo "db.getCollectionNames().forEach(function(c){if(c.indexOf(\"${prefix}\") === 0){db[c].createIndex({last_sync: -1},{background: true})}})" > $tmp_file
mongosh "${connection_string}/${db}" $tmp_file
rm $tmp_file


prefix="drill_events"
db="countly_drill"
tmp_file="fadlfhsdofheinwvw.js"
echo "db.getCollectionNames().forEach(function(c){if(c.indexOf(\"${prefix}\") === 0){db[c].createIndex({cd: -1},{background: true})}})" > $tmp_file
mongosh "${connection_string}/${db}" $tmp_file
rm $tmp_file