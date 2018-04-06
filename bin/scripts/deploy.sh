#!/bin/bash

cd /home/countly;
git pull;
countly upgrade
bash bin/config/countly_user.sh