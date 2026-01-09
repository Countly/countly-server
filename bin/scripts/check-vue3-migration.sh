#!/bin/bash
# Vue 3 Migration Checker
# This script identifies files that need updates for Vue 3 compatibility

echo "=== Vue 3 Migration Checker ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/../.."

echo "Checking for Vue 2 patterns that need migration..."
echo ""

# Check 1: beforeDestroy without beforeUnmount
echo -e "${YELLOW}=== Files with 'beforeDestroy' but no 'beforeUnmount' ===${NC}"
echo "(These need to add beforeUnmount hook for Vue 3 compatibility)"
echo ""

find frontend plugins -name "*.js" -o -name "*.vue" 2>/dev/null | while read file; do
    if grep -q "beforeDestroy:" "$file" 2>/dev/null; then
        if ! grep -q "beforeUnmount:" "$file" 2>/dev/null; then
            echo "  $file"
        fi
    fi
done

echo ""

# Check 2: destroyed without unmounted
echo -e "${YELLOW}=== Files with 'destroyed' but no 'unmounted' ===${NC}"
echo "(These need to add unmounted hook for Vue 3 compatibility)"
echo ""

find frontend plugins -name "*.js" -o -name "*.vue" 2>/dev/null | while read file; do
    if grep -q "destroyed:" "$file" 2>/dev/null; then
        if ! grep -q "unmounted:" "$file" 2>/dev/null; then
            echo "  $file"
        fi
    fi
done

echo ""

# Check 3: $root.$on usage
echo -e "${YELLOW}=== Files using '\$root.\$on' ===${NC}"
echo "(These need to use EventBus for Vue 3 compatibility)"
echo ""

grep -r '\$root\.\$on' frontend plugins --include="*.js" --include="*.vue" -l 2>/dev/null | while read file; do
    # Check if already using EventBus
    if ! grep -q "EventBus" "$file" 2>/dev/null; then
        echo "  $file"
    fi
done

echo ""

# Check 4: $root.$emit usage
echo -e "${YELLOW}=== Files using '\$root.\$emit' ===${NC}"
echo "(These need to use EventBus for Vue 3 compatibility)"
echo ""

grep -r '\$root\.\$emit' frontend plugins --include="*.js" --include="*.vue" -l 2>/dev/null | while read file; do
    # Check if already using EventBus
    if ! grep -q "EventBus" "$file" 2>/dev/null; then
        echo "  $file"
    fi
done

echo ""

# Check 5: Vue.extend usage
echo -e "${YELLOW}=== Files using 'Vue.extend' ===${NC}"
echo "(These may need to use countlyVue.compat.extendComponent for Vue 3)"
echo ""

grep -r 'Vue\.extend' frontend plugins --include="*.js" --include="*.vue" -l 2>/dev/null | while read file; do
    # Skip compat.js and core.js which have the compatibility layer
    if [[ "$file" != *"compat.js"* ]] && [[ "$file" != *"core.js"* ]]; then
        echo "  $file"
    fi
done

echo ""

# Check 6: $children usage (removed in Vue 3)
echo -e "${YELLOW}=== Files using '\$children' ===${NC}"
echo "(\$children is removed in Vue 3 - use refs or provide/inject)"
echo ""

grep -r '\$children' frontend plugins --include="*.js" --include="*.vue" -l 2>/dev/null

echo ""

# Check 7: $listeners usage (merged into $attrs in Vue 3)
echo -e "${YELLOW}=== Files using '\$listeners' ===${NC}"
echo "(\$listeners is merged into \$attrs in Vue 3)"
echo ""

grep -r '\$listeners' frontend plugins --include="*.js" --include="*.vue" -l 2>/dev/null

echo ""

# Summary
echo -e "${GREEN}=== Summary ===${NC}"
echo ""
echo "After fixing the above issues, you can switch to Vue 3 by:"
echo "1. Replacing vue.min.js with Vue 3.4 build"
echo "2. Replacing vuex.min.js with Vuex 4 build"
echo "3. Replacing vue-router.min.js with Vue Router 4 build"
echo "4. Replacing Element UI with Element Plus"
echo ""
echo "See docs/VUE3_MIGRATION.md for detailed migration guide."
echo "See docs/ELEMENT_PLUS_MIGRATION.md for Element Plus changes."
