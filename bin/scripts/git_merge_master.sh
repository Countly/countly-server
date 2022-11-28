#!/bin/bash

#git config
git config --global user.email "next@count.ly"
git config --global user.name "next"

#get all git data
git fetch --all

#get latest from master
git checkout master
git pull

#get latest from next
git checkout next
git pull
BRANCH="$(git symbolic-ref --short HEAD)";

if [ "$BRANCH" == "next" ]; then
    #merge master into next
    git merge master

    #push changes to next
    git push
else
    exit 1;
fi