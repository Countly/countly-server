#!/bin/bash

set -e
set -o pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

read -p"Have you backup drill collections before start process source?(y/n):" -n 1 -r
echo 
if [[ "$REPLY" =~ ^[Yy]$ ]]
then
    nodejs "$DIR/process_source.js"
    echo "Finished modify";
fi



