#!/bin/bash

function countly_start { 
    start countly-supervisor;
} 

function countly_stop { 
    stop countly-supervisor;
} 

function countly_restart { 
    restart countly-supervisor;
} 
