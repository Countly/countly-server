#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

find $DIR/../../../ -type f  -name "*.sh" -print |
  while IFS="" read -r file
  do
    shellcheck "$file"
  done