#!/bin/bash

set -e
set -o pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

nodejs $DIR/process_source.js backup | /bin/bash;
echo "Finished backup";


nodejs $DIR/process_source.js modify 
echo "Finished modify";
