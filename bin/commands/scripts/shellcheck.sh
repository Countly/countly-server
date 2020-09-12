#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STATUS=0
while IFS="" read -r file
do
  if [[ $file != *"/node_modules/"* ]] && [[ $file != *"/core/"* ]] && [[ $file != *"/bin/scripts/nghttp2/"* ]]; then
      if ! shellcheck "$file"
      then
          STATUS=1
      fi
  fi
done < <(find "$DIR/../../../" -type f  -name "*.sh" -print)
  
 exit $STATUS