#!/bin/bash
con=$(countly mongo)
res=$(mongo countly ${con} --eval "print('CLYTest')")
if ! [[ $res == *"CLYTest"* ]]; then
    echo -e "Can't connect to MongoDB";
fi