#!/bin/bash

set -e

echo "Script started. Working directory: $(pwd)"
echo "Received arguments: $*"

if [ -z "$1" ]; then
    echo "Error: No plugin names provided."
    exit 1
fi

# Read the comma-separated list of plugin names
IFS=',' read -ra PLUGINS <<< "$1"

# Get the path to the plugin.js script
PLUGIN_JS_PATH="$(pwd)/bin/commands/scripts/plugin.js"

# Loop through each plugin name
for plugin in "${PLUGINS[@]}"; do
    # Trim whitespace
    plugin=$(echo "$plugin" | xargs)
    
    echo "Attempting to disable plugin: $plugin"
    
    # Run the Node.js command for each plugin
    if node --preserve-symlinks --preserve-symlinks-main "$PLUGIN_JS_PATH" disable "$plugin"; then
        echo "Successfully disabled plugin: $plugin"
    else
        echo "Failed to disable plugin: $plugin"
    fi
done

echo "Script completed."