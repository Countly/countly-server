#!/bin/bash

#git config
git config --global user.email "next@count.ly"
git config --global user.name "next"

#get latest from next
git checkout next
BRANCH="$(git symbolic-ref --short HEAD)";

echo "Checking branch $BRANCH"

if [ "$BRANCH" == "next" ]; then
    #merge master into next
    git merge master

    #push changes to next
    #git push
else
    exit 1;
fi