#!/bin/bash
# shellcheck disable=SC2016,SC2086,SC2046

# Script configuration
set -euo pipefail  # Exit on error, undefined vars, and pipe failures
trap 'echo "Error on line $LINENO. Exit code: $?"' ERR

# Configuration variables
REPO_URL="git@github.com:Countly/countly-enterprise-plugins.git"
REPO_NAME="countly"
BRANCH="jobserver"
LOG_FILE="setup_$(date +%Y%m%d_%H%M%S).log"
DIR="$(pwd)/$REPO_NAME"

# Plugins that will be disabled by default
DISABLED_PLUGINS=(
    "ab-testing"
    "active_directory"
    "adjust"
    "browser"
    "cognito"
    "crashes-jira"
    "empty"
    "enterpriseinfo"
    "hooks"
    "ip_store"
    "ldap"
    "my-countly"
    "oidc"
    "okta"
    "old-ui-compatibility"
    "push"
    "push_approver"
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

    # Submodules setup
    log "INFO" "Setting up submodules..."
    git submodule status
    git pull
    git submodule init
    git submodule update
}

# Core setup
setup_core() {
    log "INFO" "Setting up core..."
    cd "$DIR/core" || exit 1

    git config core.fileMode false
    git checkout "$BRANCH"
    git pull
    git config --global --add safe.directory "$DIR/core"
}

# Plugin linking
link_plugins() {
    log "INFO" "Linking plugins..."

    cd "$DIR/plugins" || exit 1
    for d in */; do
        plugin_name=${d%/}  # Remove trailing slash
        if [ ! -d "$DIR/core/plugins/$plugin_name" ]; then
            ln -s "$DIR/plugins/$d" "$DIR/core/plugins/$plugin_name"
        fi
    done

    # Data manager special handling
    (
        cd "$DIR/plugins/data-manager" || exit 1
        while IFS= read -r -d '' file; do
            if [ ! -d "$DIR/core/plugins/data-manager${file#.}" ] && [ ! -f "$DIR/core/plugins/data-manager${file#.}" ]; then
                ln -s "$DIR/plugins/data-manager${file#.}" "$DIR/core/plugins/data-manager${file#.}"
            fi
        done < <(find . -print0)
    )

    # Setup git ignore for symlinks
    (
        cd "$DIR/core" || exit 1
        IGNORE_FILE="$HOME/.ignoresymfiles"
        find . -type l | sed -e s'/^\.\///g' > "$IGNORE_FILE"
        chmod 644 "$IGNORE_FILE"  # More appropriate permissions for a config file
        git config core.excludesfile "$IGNORE_FILE" || log "WARNING" "Could not set git exclude file, but continuing..."
    )

    log "INFO" "EE plugins linked"
}

# Configuration setup
setup_configuration() {
    log "INFO" "Setting up configuration files..."

    # Create symblink of node_modules for eslint
    ln -s "$DIR/core/node_modules" "$DIR/node_modules"

    # Copy config files if they don't exist
    cp -n "$DIR/core/api/config.sample.js" "$DIR/core/api/config.js" || log "WARNING" "Skipping api config - file may already exist"
    cp -n "$DIR/core/plugins/plugins.default.json" "$DIR/core/plugins/plugins.json" || log "WARNING" "Skipping plugins config - file may already exist"
    cp -n "$DIR/core/frontend/express/config.sample.js" "$DIR/core/frontend/express/config.js" || log "WARNING" "Skipping express config - file may already exist"
    cp -n "$DIR/core/frontend/express/public/javascripts/countly/countly.config.sample.js" "$DIR/core/frontend/express/public/javascripts/countly/countly.config.js" || log "WARNING" "Skipping express config - file may already exist"

    # Use platform-independent sed syntax
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's#countlyGlobal.path#"http://localhost:3001"#g' "$DIR/core/frontend/express/public/javascripts/countly/countly.config.js"
        sed -i '' 's/max_pool_size: 500/max_pool_size: 20/g' "$DIR/core/api/config.js"
    else
        # Linux and others
        sed -i 's#countlyGlobal.path#"http://localhost:3001"#g' "$DIR/core/frontend/express/public/javascripts/countly/countly.config.js"
        sed -i 's/max_pool_size: 500/max_pool_size: 20/g' "$DIR/core/api/config.js"
    fi
}

# Plugin management
manage_plugins() {
    log "INFO" "Managing plugins..."

    PLUGIN_JS_PATH="$DIR/core/bin/commands/scripts/plugin.js"
    for dir in "$DIR/core/plugins"/*/; do
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
            if FORCE_NPM_INSTALL=true COUNTLY_CONFIG__SYMLINKED=true node --preserve-symlinks --preserve-symlinks-main "$PLUGIN_JS_PATH" disable "$plugin"; then
                log "INFO" "Successfully disabled $plugin"
            else
                log "ERROR" "Failed to disable $plugin"
            fi
        else
            log "INFO" "Enabling $plugin..."
            if FORCE_NPM_INSTALL=true COUNTLY_CONFIG__SYMLINKED=true node --preserve-symlinks --preserve-symlinks-main "$PLUGIN_JS_PATH" enable "$plugin"; then
                log "INFO" "Successfully enabled $plugin"
            else
                log "ERROR" "Failed to enable $plugin"
            fi
        fi
    done
}

# Main execution
main() {
    log "INFO" "Starting setup script..."

    check_prerequisites
    setup_repository
    setup_core
    link_plugins

    # Set permissions - but don't fail if we don't have sudo
    sudo chmod -R 766 "$DIR" || {
        log "WARNING" "Could not set full permissions on $DIR. You may need to adjust permissions manually."
    }

    # Install dependencies
    cd "$DIR/core" || exit 1
    npm install

    setup_configuration
    manage_plugins

    log "INFO" "Setup completed successfully!"
}

# Execute main function
main