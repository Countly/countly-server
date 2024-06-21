#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [[ "$COUNTLY_CONFIG__SYMLINKED" == "true" ]]; then
    node --preserve-symlinks --preserve-symlinks-main "$DIR/install_plugins"
else
    node "$DIR/install_plugins"
fi