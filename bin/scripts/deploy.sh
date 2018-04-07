#!/bin/bash

if [ "$TRAVIS_PULL_REQUEST" == "false" ] && [ "$TRAVIS_BRANCH" == "master" ]; then
    ssh -oStrictHostKeyChecking=no countly@128.199.45.30 "bash /home/countly/deploy.sh > /home/countly/logs/countly-deploy-$TRAVIS_BUILD_NUMBER-$TRAVIS_COMMIT.log 2>&1 &"
fi