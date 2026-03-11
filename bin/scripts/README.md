# Custom Scripts

This directory contains utility scripts for Countly Server maintenance, data operations, and administration tasks.

## Script Requirements

All scripts in this directory must follow these requirements:

### 1. Header Comment

Every script must have a descriptive header comment:

```bash
#!/bin/bash

#  Description of what this script does
#  Server: mongodb / countly / any (which server it should run on)
#  Path: where the script should be located to run
#  Command: example command to run the script
```

**Example:**
```bash
#!/bin/bash

#  Export all mongodb data using collection by collection export
#  Server: mongodb or any server with mongotools installed with mongoexport command
#  Path: any
#  Command: bash full_export.sh
```

### 2. Configurable Variables

All configurable values must be listed at the top with comments:

```bash
#connection string without database
connection_string="mongodb://localhost"

#database which to export
db="countly"

#output directory for results
out_dir="./output"
```

### 3. Output & Logging

- Scripts must provide output showing progress
- Scripts must properly log all errors
- Use `echo` statements to show what's happening

### 4. Dry Run Option

Especially for destructive operations (delete, modify), provide a `dry_run` option:

```bash
#set to true to only show what would be deleted, false to actually delete
dry_run=true
```

### 5. Idempotent Design

Scripts must be safe to run multiple times without causing issues.

### 6. No Customer Data

Never include customer-specific data. Make everything configurable:
- API keys
- App IDs
- Connection strings
- Paths

---

## Script Types

### Bash Scripts

For command-line operations and system tasks.

```bash
#!/bin/bash
# Run with: bash script_name.sh
```

Validate with shellcheck:
```bash
countly shellcheck
```

### Node.js Scripts

For complex logic and API interactions.

```javascript
// Run with: node script_name.js
```

### MongoDB Scripts

For database queries and data manipulation.

```javascript
// Run with: mongo < script_name.js
// Or: mongosh script_name.js
```

---

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `customer_specific/` | Customer-specific migration scripts |
| `data-cleanup/` | Scripts to clean up old/invalid data |
| `data-reports/` | Data reporting and analysis scripts |
| `device_list/` | Device list management |
| `expire-data/` | Data expiration utilities |
| `export-data/` | Data export scripts |
| `fix-data/` | Data repair and fix scripts |
| `localization/` | Localization utilities |
| `member-managament/` | User/member management scripts |
| `modify-data/` | Data modification scripts |
| `performance-monitoring/` | Performance analysis tools |
| `sharding/` | MongoDB sharding scripts |
| `timezones/` | Timezone data management |

---

## Common Scripts

| Script | Description |
|--------|-------------|
| `add_indexes.js` | Add database indexes |
| `drill_index.js` | Manage drill indexes |
| `check-translations.js` | Validate translation files |
| `loadCitiesInDb.js` | Load city data for geo features |
| `test.connection.js` | Test database connectivity |

---

## Example: Writing a Custom Script

Here's a template for a new bash script:

```bash
#!/bin/bash

#  Remove specified folder from the system
#  If dry_run is false, will remove the folder,
#  else will output which folder will be removed
#  Server: countly
#  Path: any
#  Command: bash remove_directory.sh

#=== CONFIGURATION ===

#folder to remove
target_folder="/path/to/folder"

#set to true to only show what would happen
dry_run=true

#=== SCRIPT ===

echo "Target folder: $target_folder"

if [ ! -d "$target_folder" ]; then
    echo "ERROR: Folder does not exist: $target_folder"
    exit 1
fi

if [ "$dry_run" = true ]; then
    echo "[DRY RUN] Would remove: $target_folder"
    echo "[DRY RUN] Contents:"
    ls -la "$target_folder"
else
    echo "Removing folder: $target_folder"
    rm -rf "$target_folder"
    if [ $? -eq 0 ]; then
        echo "SUCCESS: Folder removed"
    else
        echo "ERROR: Failed to remove folder"
        exit 1
    fi
fi

echo "Done."
```

---

## Submitting Scripts

1. Create your script following the requirements above
2. Test thoroughly in a development environment
3. Ensure no customer data is included
4. Submit via Pull Request to the appropriate subdirectory
5. Add script to JIRA ticket if applicable

---

## Validation

Before committing bash scripts, validate with shellcheck:

```bash
# Check a specific script
shellcheck path/to/script.sh

# Check all scripts in Countly
countly shellcheck
```

This check runs automatically on Pull Requests.
