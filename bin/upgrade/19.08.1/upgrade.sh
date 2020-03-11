#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DATE=$(date +%Y-%m-%d:%H:%M:%S)
VERSION="$(basename "${DIR}")" 
if [ -f "$DIR/upgrade_fs.sh" ]; then
    bash "$DIR/upgrade_fs.sh";
fi
if [ -f "$DIR/upgrade_db.sh" ]; then
    bash "$DIR/upgrade_db.sh";
fi
