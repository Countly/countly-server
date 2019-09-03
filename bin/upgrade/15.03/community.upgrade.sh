#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

( stop countly-supervisor ; 
cd "$DIR" ; 
node rename_event_collections.js ;
mongo sessions.js ; 
mongo events.js ; 
mongo cleanup.js ; 
mongo add_uid_app_users.js ;
start countly-supervisor
)