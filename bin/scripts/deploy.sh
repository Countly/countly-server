#!/bin/bash

if [ "$TRAVIS_PULL_REQUEST" == "false" ] && [ "$TRAVIS_REPO_SLUG" == "Countly/countly-server" ]; then
    if [ "$TRAVIS_BRANCH" == "master" ] || [ "$TRAVIS_BRANCH" == "next" ]; then
        openssl aes-256-cbc -K $encrypted_2b5a1ad4da99_key -iv $encrypted_2b5a1ad4da99_iv -in deploy-key.enc -out deploy-key -d;
        chmod 600 deploy-key;
        mv deploy-key ~/.ssh/id_rsa;
        ssh -oStrictHostKeyChecking=no countly@$TRAVIS_BRANCH.count.ly "bash /home/countly/deploy.sh > /home/countly/logs/countly-deploy-$TRAVIS_BUILD_NUMBER-$TRAVIS_COMMIT.log 2>&1 &"
    fi
fi
