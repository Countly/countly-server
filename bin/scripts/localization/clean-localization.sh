#!/bin/bash

# Script to clean unused localization keys from a Countly plugin's properties file
# and automatically apply the changes

set -e # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
COUNTLY_ROOT="$(cd "$SCRIPT_DIR/../../.." &> /dev/null && pwd )" # Fix: Go up three levels from bin/scripts/localization
PLUGINS_DIR="$COUNTLY_ROOT/plugins" # Fix: Use the plugins directory at the root level

# Default values
APPLY_CHANGES=false
SKIP_CONFIRMATION=false

# Print usage
function print_usage {
    echo "Usage: $0 <plugin-name> [<properties-file>] [--apply] [--force]"
    echo
    echo "Arguments:"
    echo "  plugin-name       Name of the plugin to scan (required)"
    echo "  properties-file   Name of the properties file without .properties extension"
    echo "                    (defaults to plugin name if not provided)"
    echo
    echo "Options:"
    echo "  --apply           Automatically apply changes to the original properties file"
    echo "  --force           Skip confirmation when applying changes"
    echo
    echo "Examples:"
    echo "  $0 alerts                   # Check alerts plugin with alerts.properties"
    echo "  $0 surveys surveys          # Check surveys plugin with surveys.properties"
    echo "  $0 alerts --apply           # Check and apply changes to alerts.properties"
    echo "  $0 alerts --apply --force   # Check and apply changes without confirmation"
}

# Parse arguments
PLUGIN_NAME=""
PROPERTIES_FILE=""
REMAINING_ARGS=()

for arg in "$@"; do
    case $arg in
        --apply)
            APPLY_CHANGES=true
            ;;
        --force)
            SKIP_CONFIRMATION=true
            ;;
        --help|-h)
            print_usage
            exit 0
            ;;
        -*)
            echo "Unknown option: $arg"
            print_usage
            exit 1
            ;;
        *)
            if [ -z "$PLUGIN_NAME" ]; then
                PLUGIN_NAME="$arg"
            elif [ -z "$PROPERTIES_FILE" ]; then
                PROPERTIES_FILE="$arg"
            else
                REMAINING_ARGS+=("$arg")
            fi
            ;;
    esac
done

# Check if plugin name was provided
if [ -z "$PLUGIN_NAME" ]; then
    echo "Error: No plugin name provided"
    print_usage
    exit 1
fi

# Use plugin name as properties file name if not provided
if [ -z "$PROPERTIES_FILE" ]; then
    PROPERTIES_FILE="$PLUGIN_NAME"
fi

# Define paths
PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_NAME"
PROPERTIES_PATH="$PLUGIN_DIR/frontend/public/localization/$PROPERTIES_FILE.properties"
BACKUP_PATH="$PROPERTIES_PATH.backup"
CLEAN_PATH="$PROPERTIES_PATH.clean"
NODE_SCRIPT="$SCRIPT_DIR/clean-localization-keys.js"

# Check if the plugin directory exists
if [ ! -d "$PLUGIN_DIR" ]; then
    echo "Error: Plugin directory not found at $PLUGIN_DIR"
    exit 1
fi

# Check if the properties file exists
if [ ! -f "$PROPERTIES_PATH" ]; then
    echo "Error: Properties file not found at $PROPERTIES_PATH"
    echo "Make sure the plugin has a localization file at: frontend/public/localization/$PROPERTIES_FILE.properties"
    exit 1
fi

# Main execution
echo "===== Cleaning unused localization keys from $PROPERTIES_FILE.properties ====="
echo

# Create a backup of the original file, unless running with --apply --force
if [ "$APPLY_CHANGES" = true ] && [ "$SKIP_CONFIRMATION" = true ]; then
    # Skip backup when running with both --apply and --force
    echo "Skipping backup creation (running with --apply --force)"
else
    echo "Creating backup of original file at $BACKUP_PATH"
    cp "$PROPERTIES_PATH" "$BACKUP_PATH"
    echo "Backup created successfully."
fi
echo

# Run the Node.js cleanup script
echo "Running cleanup script..."
node "$NODE_SCRIPT" "$PLUGIN_NAME" "$PROPERTIES_FILE"
echo

# Check if the cleaned file exists
if [ ! -f "$CLEAN_PATH" ]; then
    echo "No changes were applied. The script did not produce a cleaned file."
    exit 0
fi

# Check if there are any differences
if cmp -s "$PROPERTIES_PATH" "$CLEAN_PATH"; then
    echo "No changes detected. The original and cleaned files are identical."
    # Remove the clean file since it's the same as the original
    rm "$CLEAN_PATH"
    exit 0
fi

# Apply changes if requested
if [ "$APPLY_CHANGES" = true ]; then
    if [ "$SKIP_CONFIRMATION" = false ]; then
        echo "Do you want to apply these changes to the original properties file? [y/N]"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Changes not applied. You can find the cleaned file at: $CLEAN_PATH"
            exit 0
        fi
    fi
    
    echo "Applying changes to original properties file..."
    cp "$CLEAN_PATH" "$PROPERTIES_PATH"
    rm "$CLEAN_PATH"
    echo "Changes applied successfully."
    
    # Only mention the backup if we created one
    if [ "$SKIP_CONFIRMATION" = false ] || [ "$APPLY_CHANGES" = false ]; then
        echo "Original file backed up at: $BACKUP_PATH"
        echo "If you need to restore the original file, run: cp $BACKUP_PATH $PROPERTIES_PATH"
    fi
else
    echo "To apply the changes, use the --apply option or manually copy the cleaned file:"
    echo "cp $CLEAN_PATH $PROPERTIES_PATH"
fi

echo
echo "===== Cleanup process complete! ====="