#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STATUS=0
while IFS="" read -r file
do
  if [[ $file != *"/node_modules/"* ]] && [[ $file != *"/core/"* ]] && [[ $file != *"/bin/scripts/nghttp2/"* ]]; then
      if ! shellcheck -e SC2230 -e SC2236 -e SC2164 -e SC2237 -e SC2002 -e SC2012 -e SC2001 -e SC2116 "$file"
      then
          STATUS=1
      fi
  fi
done < <(find "$DIR/../" -type f  -name "*.sh" -print)

 exit $STATUS