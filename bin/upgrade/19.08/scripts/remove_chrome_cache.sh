#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../../../" && pwd )"

#remove chrome cache
rm -rf "$DIR/dump/chrome/"*
