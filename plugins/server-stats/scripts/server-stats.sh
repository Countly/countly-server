#!/bin/bash

usage (){
    echo "countly server-stats usage:";
    echo ""
    echo "Available commands: 'dp', 'top', 'hourly'"
    echo ""
    echo "countly server-stats dp              # dp for current month"
    echo "countly server-stats dp 2021-3       # dp for specific month"
    echo "countly server-stats dp 3_months     # dp for 3, 6 or 12 months"
    echo "countly server-stats top             # top apps with dp in current hour"
    echo "countly server-stats hourly          # punch card with hourly data max dp"
    echo "countly server-stats hourly avg      # punch card with hourly data for specific metric, min, max, sum or avg"
}
usage;