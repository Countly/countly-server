#!/usr/bin/env bash

for var in "$@"
do
    countly plugin disable "$var"
done
countly upgrade
