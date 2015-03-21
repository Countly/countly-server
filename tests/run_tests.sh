#!/bin/bash

# if not running in vagrant, run in vagrant :)
if [ ! -d /vagrant ]; then
  vagrant up
  vagrant ssh -c "/vagrant/tests/run_tests.sh"
  exit $?
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd $DIR > /dev/null

# check & install dependencies as required
for DEP in coffee-script mocha chai; do
  if [ ! -d node_modules/$DEP ]; then
    npm install $DEP
  fi
done

# run integration tests
PATH=$(npm bin):$PATH mocha --compilers coffee:coffee-script/register --recursive integration/

popd > /dev/null
