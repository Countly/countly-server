#!/bin/bash

if [ -z "$GITHUB_HEAD_REF" ] && [ "$GITHUB_REPOSITORY" == "Countly/countly-server" ]; then
    GITHUB_BRANCH=${GITHUB_REF#refs/heads/}
    echo "$GITHUB_BRANCH"
    if [ "$GITHUB_BRANCH" == "master" ] || [ "$GITHUB_BRANCH" == "next" ]; then
        echo "$SSH_PRIVATE_KEY" > deploy-key;
        mkdir -p ~/.ssh;
        mv deploy-key ~/.ssh/id_rsa;
        chmod 600 ~/.ssh/id_rsa;
        ssh -oStrictHostKeyChecking=no "countly@$GITHUB_BRANCH.count.ly" "bash /home/countly/deploy.sh > /home/countly/logs/countly-deploy-github.log 2>&1 &"
        if [ "$GITHUB_BRANCH" == "master" ]; then
            ssh -oStrictHostKeyChecking=no "countly@ce.count.ly" "bash /home/countly/deploy.sh > /home/countly/logs/countly-deploy-github.log 2>&1 &"
        fi
    fi
fi
