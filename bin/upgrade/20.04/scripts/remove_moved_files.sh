#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../../../" && pwd )"

#remove files if they exist
if [ -f "$DIR/plugins/cohorts/frontend/public/javascripts/cohorts.drawer.js" ]; then
    rm "$DIR/plugins/cohorts/frontend/public/javascripts/cohorts.drawer.js";
fi

if [ -f "$DIR/plugins/drill/frontend/public/javascripts/drill.query.builder.js" ]; then
    rm "$DIR/plugins/drill/frontend/public/javascripts/drill.query.builder.js";
fi

if [ -f "$DIR/plugins/formulas/frontend/public/javascripts/formula.builder.js" ]; then
    rm "$DIR/plugins/formulas/frontend/public/javascripts/formula.builder.js";
fi

if [ -f "$DIR/plugins/retention_segments/frontend/public/javascripts/rangepicker.js" ]; then
    rm "$DIR/plugins/retention_segments/frontend/public/javascripts/rangepicker.js";
fi
