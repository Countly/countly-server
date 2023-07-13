#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

(
cd "$DIR/../../plugins"
plugins="[";
for d in */ ; do
    plugins="$plugins\"${d::-1}\","
done
plugins="${plugins::-1}]"
echo "Adding all plugins"
echo "$plugins"
echo "$plugins" > plugins.json

)
