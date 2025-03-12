#!/bin/bash
# shellcheck disable=SC2016,SC2086,SC2046

# Script configuration
set -euo pipefail  # Exit on error, undefined vars, and pipe failures
trap 'echo "Error on line $LINENO. Exit code: $?"' ERR

# Configuration variables
REPO_URL="git@github.com:Countly/countly-server.git"
REPO_NAME="countly-community"
BRANCH="master"
LOG_FILE="community_setup_$(date +%Y%m%d_%H%M%S).log"
DIR="$(pwd)/$REPO_NAME"

# Plugins that will be disabled by default
DISABLED_PLUGINS=(
    "browser"
    "empty"
    "enterpriseinfo"
    "hooks"
    "ip_store"
    "ldap"
    "old-ui-compatibility"
    "push"
    "recaptcha"
    "tracker"
    "two-factor-auth"
    "vue-example"
    "white-labeling"
)

# Logging function
log() {
    local level=$1
    shift
    local message=$*
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Prerequisites check
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    local prerequisites=(git node npm)
    for cmd in "${prerequisites[@]}"; do
        if ! command_exists "$cmd"; then
            log "ERROR" "Required command '$cmd' not found. Please install it and try again."
            exit 1
        fi
    done

    # Create nodejs symlink if it doesn't exist and node is not already available as nodejs
    if ! command_exists nodejs && command_exists node; then
        log "INFO" "Creating nodejs symlink..."
        sudo ln -s "$(command -v node)" /usr/local/bin/nodejs || {
            log "WARNING" "Could not create nodejs symlink, but continuing as node is available"
        }
    fi

    log "INFO" "All prerequisites verified"
}

# Repository setup
setup_repository() {
    log "INFO" "Setting up repository..."

    if [ -d "$REPO_NAME" ]; then
        local answer
        read -r -p "Directory $REPO_NAME already exists. Backup (b), remove (r), or exit (e)? " answer
        case $answer in
            b|B)
                log "INFO" "Backing up existing directory..."
                mv "$REPO_NAME" "${REPO_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
                ;;
            r|R)
                log "INFO" "Removing existing directory..."
                rm -rf "$REPO_NAME"
                ;;
            *)
                log "INFO" "Exiting as per user request"
                exit 0
                ;;
        esac
    fi

    git clone "$REPO_URL" "$REPO_NAME" || {
        log "ERROR" "Failed to clone repository. Please check your SSH key and repository access."
        exit 1
    }

    cd "$REPO_NAME" || exit 1

    # Git configuration
    git config --global --add safe.directory "$DIR"
    git config core.fileMode false
    git checkout "$BRANCH"

    # Submodules setup if any
    log "INFO" "Setting up submodules..."
    git submodule status
    git pull
    git submodule init
    git submodule update
}

# Configuration setup
setup_configuration() {
    log "INFO" "Setting up configuration files..."

    # Copy config files if they don't exist
    cp -n "$DIR/api/config.sample.js" "$DIR/api/config.js" || log "WARNING" "Skipping api config - file may already exist"
    cp -n "$DIR/plugins/plugins.default.json" "$DIR/plugins/plugins.json" || log "WARNING" "Skipping plugins config - file may already exist"
    cp -n "$DIR/frontend/express/config.sample.js" "$DIR/frontend/express/config.js" || log "WARNING" "Skipping express config - file may already exist"
    cp -n "$DIR/frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/frontend/express/public/javascripts/countly/countly.config.js" || log "WARNING" "Skipping frontend config - file may already exist"

    # Use platform-independent sed syntax
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's#countlyGlobal.path#"http://localhost:3001"#g' "$DIR/frontend/express/public/javascripts/countly/countly.config.js"
        sed -i '' 's/max_pool_size: 500/max_pool_size: 20/g' "$DIR/api/config.js"
    else
        # Linux and others
        sed -i 's#countlyGlobal.path#"http://localhost:3001"#g' "$DIR/frontend/express/public/javascripts/countly/countly.config.js"
        sed -i 's/max_pool_size: 500/max_pool_size: 20/g' "$DIR/api/config.js"
    fi
}

# Plugin management
manage_plugins() {
    log "INFO" "Managing plugins..."

    PLUGIN_JS_PATH="$DIR/bin/commands/scripts/plugin.js"
    for dir in "$DIR/plugins"/*/; do
        plugin=$(basename "$dir")

        # Using a for loop to check array membership
        is_disabled=0
        for disabled_plugin in "${DISABLED_PLUGINS[@]}"; do
            if [ "$plugin" = "$disabled_plugin" ]; then
                is_disabled=1
                break
            fi
        done

        if [ "$is_disabled" -eq 1 ]; then
            log "INFO" "Disabling $plugin..."
            if node "$PLUGIN_JS_PATH" disable "$plugin"; then
                log "INFO" "Successfully disabled $plugin"
            else
                log "ERROR" "Failed to disable $plugin"
            fi
        else
            log "INFO" "Enabling $plugin..."
            if node "$PLUGIN_JS_PATH" enable "$plugin"; then
                log "INFO" "Successfully enabled $plugin"
            else
                log "ERROR" "Failed to enable $plugin"
            fi
        fi
    done
}

# Main execution
main() {
    log "INFO" "Starting community setup script..."

    check_prerequisites
    setup_repository

    # Set permissions - but don't fail if we don't have sudo
    sudo chmod -R 766 "$DIR" || {
        log "WARNING" "Could not set full permissions on $DIR. You may need to adjust permissions manually."
    }

    # Install dependencies
    cd "$DIR" || exit 1
    npm install

    setup_configuration
    manage_plugins

    # build locales and sass
    npx grunt dist-all

    log "INFO" "Community setup completed successfully!"
    log "INFO" "You can now start Countly by using the debugger"
}

# Execute main function
main