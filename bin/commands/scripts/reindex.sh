#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

nodejs "$DIR/../../scripts/add_indexes.js";
nodejs "$DIR/../../scripts/install_plugins.js";