#!/bin/bash

# Vue 3 Migration - Library Setup Script
# This script sets up Vue 3 libraries from npm packages
# 
# USAGE:
#   1. First run: npm install (to install packages from package.json)
#   2. Then run: npx grunt vue3libs (to copy libraries to frontend)
#
# OR run this script which does both

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
VUE_DIR="$PROJECT_ROOT/frontend/express/public/javascripts/utils/vue"

echo "Vue 3 Migration - Library Setup Script"
echo "======================================="
echo ""

# Create backup directory
BACKUP_DIR="$VUE_DIR/vue2-backup"
mkdir -p "$BACKUP_DIR"

echo "1. Backing up Vue 2 libraries..."
if [ -f "$VUE_DIR/vue.min.js" ] && [ ! -f "$BACKUP_DIR/vue.min.js" ]; then
    cp "$VUE_DIR/vue.min.js" "$BACKUP_DIR/vue.min.js"
    echo "   - Backed up vue.min.js"
fi
if [ -f "$VUE_DIR/vuex.min.js" ] && [ ! -f "$BACKUP_DIR/vuex.min.js" ]; then
    cp "$VUE_DIR/vuex.min.js" "$BACKUP_DIR/vuex.min.js"
    echo "   - Backed up vuex.min.js"
fi
if [ -f "$VUE_DIR/composition-api.min.js" ] && [ ! -f "$BACKUP_DIR/composition-api.min.js" ]; then
    cp "$VUE_DIR/composition-api.min.js" "$BACKUP_DIR/composition-api.min.js"
    echo "   - Backed up composition-api.min.js"
fi
if [ -f "$VUE_DIR/element-ui.js" ] && [ ! -f "$BACKUP_DIR/element-ui.js" ]; then
    cp "$VUE_DIR/element-ui.js" "$BACKUP_DIR/element-ui.js"
    echo "   - Backed up element-ui.js"
fi
if [ -f "$VUE_DIR/vuedraggable.umd.min.js" ] && [ ! -f "$BACKUP_DIR/vuedraggable.umd.min.js" ]; then
    cp "$VUE_DIR/vuedraggable.umd.min.js" "$BACKUP_DIR/vuedraggable.umd.min.js"
    echo "   - Backed up vuedraggable.umd.min.js"
fi
if [ -f "$VUE_DIR/vue2-leaflet.min.js" ] && [ ! -f "$BACKUP_DIR/vue2-leaflet.min.js" ]; then
    cp "$VUE_DIR/vue2-leaflet.min.js" "$BACKUP_DIR/vue2-leaflet.min.js"
    echo "   - Backed up vue2-leaflet.min.js"
fi

echo ""
echo "2. Installing npm packages..."
cd "$PROJECT_ROOT"
npm install --save vue@^3.4.15 vuex@^4.1.0 element-plus@^2.5.3 vue-echarts@^6.6.8 \
    @vue-leaflet/vue-leaflet@^0.10.1 vuedraggable@^4.1.0 vue3-perfect-scrollbar@^2.0.0 \
    vee-validate@^4.12.4 @vueuse/core@^10.7.0 echarts@^5.5.0 2>/dev/null || true

echo ""
echo "3. Copying libraries to frontend..."
npx grunt vue3libs

echo ""
echo "4. Library setup complete!"
echo ""

# List copied files
echo "Copied files:"
ls -la "$VUE_DIR/"vue3*.js "$VUE_DIR/"vuex4*.js "$VUE_DIR/"element-plus*.js 2>/dev/null || echo "   (some files may not exist yet)"

echo ""
echo "======================================="
echo ""
echo "NEXT STEPS TO ACTIVATE VUE 3:"
echo ""
echo "1. Update Gruntfile.js concat:utils to use Vue 3 libraries:"
echo "   - Replace vue.min.js with vue3.min.js"
echo "   - Replace vuex.min.js with vuex4.min.js"
echo "   - Replace element-ui.js with element-plus.min.js"
echo "   - Remove composition-api.min.js (built into Vue 3)"
echo "   - Replace vuedraggable.umd.min.js with vuedraggable3.umd.min.js"
echo "   - Replace vue2-leaflet.min.js with vue3-leaflet.min.js"
echo ""
echo "2. Update CSS in Gruntfile.js cssmin:dist:"
echo "   - Replace element-ui.css with element-plus.css"
echo ""
echo "3. Run 'npx grunt dist' to rebuild"
echo ""
echo "4. Test the application thoroughly"
echo ""
echo "To ROLLBACK to Vue 2:"
echo "   cp $BACKUP_DIR/* $VUE_DIR/"
echo ""
