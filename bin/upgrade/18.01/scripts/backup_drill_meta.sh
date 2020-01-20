#!/usr/bin/env bash

set -e
set -o pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

nodejs "$DIR/export_drill_meta.js" | bash;

echo "Finished"
