#!/bin/bash

# Generate a timestamp for the log file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="deploy_$TIMESTAMP.log"

# Check if the event is a push to the "next" branch in the "Countly/countly-server" repository
if [ -z "$GITHUB_HEAD_REF" ] && [ "$GITHUB_REPOSITORY" == "Countly/countly-server" ]; then
    GITHUB_BRANCH=${GITHUB_REF#refs/heads/}
    echo "$GITHUB_BRANCH"
    if [ "$GITHUB_BRANCH" == "pipeline/stable-je-cb" ]; then
        echo "$SSH_PRIVATE_KEY" > je-deploy-key
        mkdir -p ~/.ssh
        mv je-deploy-key ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa

        # Log the deployment command with a timestamped log file
        ssh -oStrictHostKeyChecking=no "stable-je@stable-je-cb.count.ly" \
            "sudo su -c 'bash /opt/deploy.sh > /var/log/github-action/$LOG_FILE 2>&1 &'"
    fi
fi

