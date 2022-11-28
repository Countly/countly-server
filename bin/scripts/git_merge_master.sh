#!/bin/bash

#git config
git config --global user.email "next@count.ly"
git config --global user.name "next"

#get all git data
git fetch origin

#get latest from master
git checkout master
git pull origin master

#get latest from next
git checkout next
git pull origin next
BRANCH="$(git symbolic-ref --short HEAD)";

echo "Checking branch $BRANCH"

if [ "$BRANCH" == "next" ]; then
    #merge master into next
    git merge master --allow-unrelated-histories

    #push changes to next
    git push
else
    exit 1;
fi