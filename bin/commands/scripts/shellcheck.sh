#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

find "$DIR/../../../" -type f  -name "*.sh" -print |
  while IFS="" read -r file
  do
    if [[ $file != *"/node_modules/"* ]] && [[ $file != *"/core/"* ]] && [[ $file != *"/bin/scripts/nghttp2/"* ]]; then
        shellcheck "$file"
    fi
  done