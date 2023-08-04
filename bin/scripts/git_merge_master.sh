#!/bin/bash

#git config
git config --global user.email "merge@count.ly"
git config --global user.name "merge"

#get all git data
git fetch --all --no-tags

#get latest from master
git checkout master
git pull origin master --allow-unrelated-histories

#get latest from next
git checkout next
git pull origin next --allow-unrelated-histories
BRANCH="$(git symbolic-ref --short HEAD)";

if [ "$BRANCH" == "next" ]; then
    #merge master into next
    git merge master --allow-unrelated-histories

    #push changes to next
    git push
else
    exit 1;
fi