#!/bin/bash

# Vue 3 Slot Syntax Conversion Script
# Converts Vue 2 slot-scope patterns to Vue 3 v-slot patterns
#
# Before running, review changes and test thoroughly!
#
# Usage: ./convert-slot-syntax.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."

DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "DRY RUN MODE - no files will be modified"
fi

echo "Vue 3 Slot Syntax Conversion Script"
echo "===================================="
echo ""

# Find files with slot-scope
echo "Finding files with slot-scope patterns..."
FILES=$(grep -rl 'slot-scope=' "$PROJECT_ROOT/plugins" --include="*.html" 2>/dev/null || true)

if [ -z "$FILES" ]; then
    echo "No files found with slot-scope patterns."
    exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Found $FILE_COUNT files with slot-scope patterns."
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "Files that would be modified:"
    echo "$FILES"
    echo ""
    echo "Common patterns to convert:"
    echo ""
    echo "  1. <template slot-scope=\"scope\">"
    echo "     -> <template #default=\"scope\">"
    echo ""
    echo "  2. <template slot=\"header\" slot-scope=\"scope\">"
    echo "     -> <template #header=\"scope\">"
    echo ""
    echo "  3. <span slot=\"label\" slot-scope=\"scope\">"
    echo "     -> <template #label=\"scope\"><span>...</span></template>"
    echo ""
    exit 0
fi

# Perform conversions
echo "Converting slot-scope patterns..."

for file in $FILES; do
    echo "Processing: $file"
    
    # Convert <template slot-scope="xxx"> to <template #default="xxx">
    # This is the most common pattern for el-table-column
    sed -i '' 's/<template slot-scope="\([^"]*\)"/<template #default="\1"/g' "$file"
    
    # Convert <template slot="name" slot-scope="xxx"> to <template #name="xxx">
    # Handle named slots with scope
    sed -i '' 's/<template slot="\([^"]*\)" slot-scope="\([^"]*\)"/<template #\1="\2"/g' "$file"
done

echo ""
echo "Conversion complete!"
echo ""
echo "IMPORTANT: Review the changes and test thoroughly!"
echo "Some patterns may need manual adjustment, especially:"
echo "  - Non-template elements with slot attributes"
echo "  - Complex slot expressions"
echo ""

# Count remaining patterns
REMAINING=$(grep -rl 'slot-scope=' "$PROJECT_ROOT/plugins" --include="*.html" 2>/dev/null | wc -l | tr -d ' ')
echo "Remaining files with slot-scope patterns: $REMAINING"
