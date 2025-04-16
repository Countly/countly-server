#!/bin/bash

# Script to clean unused localization keys from all Countly plugins
# This script iterates through each plugin in the plugins directory
# and runs the clean-localization.sh script on each one

# Don't exit on error, we want to process all plugins even if some fail
set +e

# Correct path detection
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
COUNTLY_ROOT="$(cd "$SCRIPT_DIR/../../.." &> /dev/null && pwd )" # Go up three levels from bin/scripts/localization to countly root
PLUGINS_DIR="$COUNTLY_ROOT/plugins"
CLEAN_SCRIPT="$SCRIPT_DIR/clean-localization.sh"

# Print paths for debugging
echo "COUNTLY_ROOT: $COUNTLY_ROOT"
echo "PLUGINS_DIR: $PLUGINS_DIR"

# Default values
APPLY_CHANGES=false
SKIP_CONFIRMATION=false
VERBOSE=false
INCLUDE_PATTERN=""
EXCLUDE_PATTERN=""
DEBUG=false

# Print usage
function print_usage {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --apply           Automatically apply changes to the original properties files"
    echo "  --force           Skip confirmation when applying changes"
    echo "  --verbose         Show more detailed output"
    echo "  --debug           Show debug information about the script execution"
    echo "  --include=PATTERN Only process plugins matching the pattern (grep -E format)"
    echo "  --exclude=PATTERN Skip plugins matching the pattern (grep -E format)"
    echo "  --help, -h        Show this help message"
    echo
    echo "Examples:"
    echo "  $0                                # Check all plugins"
    echo "  $0 --apply                        # Check and apply changes to all plugins"
    echo "  $0 --apply --force                # Check and apply changes without confirmation"
    echo "  $0 --include='^(alerts|surveys)$' # Only process alerts and surveys plugins"
    echo "  $0 --exclude='^empty$'            # Process all plugins except 'empty'"
    echo "  $0 --debug                        # Show debug information"
}

# Parse arguments
for arg in "$@"; do
    case $arg in
        --apply)
            APPLY_CHANGES=true
            ;;
        --force)
            SKIP_CONFIRMATION=true
            ;;
        --verbose)
            VERBOSE=true
            ;;
        --debug)
            DEBUG=true
            ;;
        --include=*)
            INCLUDE_PATTERN="${arg#*=}"
            ;;
        --exclude=*)
            EXCLUDE_PATTERN="${arg#*=}"
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
    esac
done

# Debug check
if [ "$DEBUG" = true ]; then
    echo "DEBUG: Script location: $SCRIPT_DIR"
    echo "DEBUG: Clean script path: $CLEAN_SCRIPT"
    echo "DEBUG: Script options:"
    echo "  APPLY_CHANGES: $APPLY_CHANGES"
    echo "  SKIP_CONFIRMATION: $SKIP_CONFIRMATION"
    echo "  VERBOSE: $VERBOSE"
    echo "  DEBUG: $DEBUG"
    echo "  INCLUDE_PATTERN: $INCLUDE_PATTERN"
    echo "  EXCLUDE_PATTERN: $EXCLUDE_PATTERN"
    # Check if the Node.js script exists
    if [ -f "$CLEAN_SCRIPT" ]; then
        echo "DEBUG: Clean localization script found at $CLEAN_SCRIPT"
    else
        echo "ERROR: Clean localization script NOT found at $CLEAN_SCRIPT"
        exit 1
    fi
    # Check Node.js version
    echo "DEBUG: Node.js version: $(node --version)"
    echo
fi

# Prepare arguments for the clean-localization.sh script
CLEAN_ARGS=()
if [ "$APPLY_CHANGES" = true ]; then
    CLEAN_ARGS+=("--apply")
fi
if [ "$SKIP_CONFIRMATION" = true ]; then
    CLEAN_ARGS+=("--force")
fi

# Check if plugins directory exists
if [ ! -d "$PLUGINS_DIR" ]; then
    echo "Error: Plugins directory not found at $PLUGINS_DIR"
    exit 1
fi

# Collect all plugin directories
echo "Scanning for plugins in $PLUGINS_DIR..."
PLUGINS=()
for plugin_dir in "$PLUGINS_DIR"/*; do
    if [ -d "$plugin_dir" ]; then
        plugin_name=$(basename "$plugin_dir")
        
        # Apply include pattern if specified
        if [ -n "$INCLUDE_PATTERN" ]; then
            if ! echo "$plugin_name" | grep -Eq "$INCLUDE_PATTERN"; then
                [ "$VERBOSE" = true ] && echo "Skipping plugin '$plugin_name' (not matching include pattern)"
                continue
            fi
        fi
        
        # Apply exclude pattern if specified
        if [ -n "$EXCLUDE_PATTERN" ]; then
            if echo "$plugin_name" | grep -Eq "$EXCLUDE_PATTERN"; then
                [ "$VERBOSE" = true ] && echo "Skipping plugin '$plugin_name' (matching exclude pattern)"
                continue
            fi
        fi
        
        PLUGINS+=("$plugin_name")
    fi
done

echo "Found ${#PLUGINS[@]} plugins to process"
echo

# Process each plugin
PROCESSED=0
SUCCESS=0
FAILED=0
WITH_UNUSED_KEYS=0
FAILED_PLUGINS=()

for plugin in "${PLUGINS[@]}"; do
    echo "================================================================================"
    echo "Processing plugin: $plugin ($(( PROCESSED + 1 ))/${#PLUGINS[@]})"
    echo "================================================================================"
    
    # Check if the plugin has a localization directory
    LOCALIZATION_DIR="$PLUGINS_DIR/$plugin/frontend/public/localization"
    if [ ! -d "$LOCALIZATION_DIR" ]; then
        echo "Plugin '$plugin' does not have a localization directory. Skipping."
        echo
        ((PROCESSED++))
        continue
    fi
    
    # Check if the plugin has a properties file
    PROPERTIES_FILE="$LOCALIZATION_DIR/$plugin.properties"
    if [ ! -f "$PROPERTIES_FILE" ]; then
        echo "Plugin '$plugin' does not have a main properties file ($plugin.properties). Skipping."
        echo
        ((PROCESSED++))
        continue
    fi
    
    # Run the cleanup script on this plugin
    if [ "$DEBUG" = true ]; then
        echo "DEBUG: Running command: $CLEAN_SCRIPT $plugin ${CLEAN_ARGS[@]}"
    fi
    
    if [ "$VERBOSE" = true ]; then
        # In verbose mode, run directly to show real-time output
        "$CLEAN_SCRIPT" "$plugin" "${CLEAN_ARGS[@]}"
        RESULT=$?
    else
        # In non-verbose mode, capture output to check for unused keys
        OUTPUT_FILE=$(mktemp)
        "$CLEAN_SCRIPT" "$plugin" "${CLEAN_ARGS[@]}" > "$OUTPUT_FILE" 2>&1
        RESULT=$?
        cat "$OUTPUT_FILE"
        
        # Check if unused keys were found
        if grep -q "Found [1-9][0-9]* unused keys" "$OUTPUT_FILE"; then
            ((WITH_UNUSED_KEYS++))
        fi
        rm "$OUTPUT_FILE"
    fi
    
    # Check result
    if [ $RESULT -eq 0 ]; then
        ((SUCCESS++))
    else
        echo "ERROR: Failed to process plugin $plugin (exit code $RESULT)"
        FAILED_PLUGINS+=("$plugin ($RESULT)")
        ((FAILED++))
    fi
    
    ((PROCESSED++))
    echo
done

echo "================================================================================"
echo "Summary:"
echo "================================================================================"
echo "Total plugins processed: $PROCESSED"
echo "Successful: $SUCCESS"
echo "Failed: $FAILED"
echo "Plugins with unused keys: $WITH_UNUSED_KEYS"
echo

if [ $FAILED -gt 0 ]; then
    echo "Failed plugins:"
    for plugin in "${FAILED_PLUGINS[@]}"; do
        echo "  - $plugin"
    done
    echo
fi

echo "All done!"
exit 0