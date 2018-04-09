#!/bin/bash

if [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
    if [ "$TRAVIS_BRANCH" == "master" ] || [ "$TRAVIS_BRANCH" == "next" ]; then
        ssh -oStrictHostKeyChecking=no countly@$TRAVIS_BRANCH.count.ly "bash /home/countly/deploy.sh > /home/countly/logs/countly-deploy-$TRAVIS_BUILD_NUMBER-$TRAVIS_COMMIT.log 2>&1 &"
    fi
fi
