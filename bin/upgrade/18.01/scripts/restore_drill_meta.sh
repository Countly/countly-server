#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/drill_backups" && pwd )"

for d in "$DIR"/*; do
    echo "Restoring collection: $d";
    file=$(basename "$d")
    IFS=" " read -r -a con <<< "$(node "$DIR/../../../../commands/scripts/db.conf.js" countly_drill)"
    mongoimport "${con[@]}" --collection "${file%.json}" --upsert < "$d";
done