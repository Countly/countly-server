#!/bin/bash
# Helper script to run update_cohorts_outdated_views.js with proper MongoDB connection
# Usage: ./run_update_cohorts_outdated_views.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_FILE="$SCRIPT_DIR/update_cohorts_outdated_views.js"

# Get MongoDB connection parameters from Countly
IFS=" " read -r -a MONGO_PARAMS <<< "$(countly mongo countly)"

# Check if mongosh is available
if command -v mongosh &> /dev/null; then
    echo "Using mongosh to run the script..."
    mongosh countly "${MONGO_PARAMS[@]}" "$SCRIPT_FILE"
elif command -v mongo &> /dev/null; then
    echo "Using mongo (legacy) to run the script..."
    mongo countly "${MONGO_PARAMS[@]}" "$SCRIPT_FILE"
else
    echo "Error: Neither mongosh nor mongo command found."
    echo "Please install MongoDB Shell (mongosh) or use the legacy mongo client."
    echo ""
    echo "Alternative: Run the script manually with your MongoDB connection:"
    echo "  mongosh 'mongodb://localhost:27017/countly' update_cohorts_outdated_views.js"
    exit 1
fi


