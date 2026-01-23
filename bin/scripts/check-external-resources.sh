#!/bin/bash
# check-external-resources.sh
# Fails if any external web resource (except allowed) is referenced in the codebase.


# Use grep -r with --include to scan only .js, .html, .css, .scss files in api/ and frontend/



FILES=$(find api frontend plugins \
  -type f \
  \( -name '*.js' -o -name '*.html' -o -name '*.css' -o -name '*.scss' \) \
  ! -path '*/node_modules/*' \
  ! -path '*/tests/*' \
  ! -path '*/test/*' \
  ! -path '*/ui-tests/*' \
  ! -path '*/scripts/*' \
  ! -path 'frontend/express/public/sdk/*' \
  ! -path 'frontend/express/public/javascripts/min/*' \
  )

RESULT=""
for file in $FILES; do
  # Remove single-line (//), multi-line (/* */), and HTML (<!-- -->) comments
  CLEANED=$(awk '
    BEGIN { in_block=0; in_html=0; }
    # Start of /* ... */ block
    /\/\*/ { if (!in_block && match($0, /\/\*/)) { in_block=1 } }
    # End of /* ... */ block
    /\*\// { if (in_block && match($0, /\*\//)) { in_block=0; next } }
    # Start of <!-- ... --> block
    /<!--/ { if (!in_html && match($0, /<!--/)) { in_html=1 } }
    /-->/ { if (in_html && match($0, /-->/)) { in_html=0; next } }
    # Skip lines inside block or html comments
    in_block || in_html { next }
    # Skip single-line // comments (even indented)
    /^[ \t]*\/\// { next }
    # Skip lines starting with * (even indented)
    /^[ \t]*\*/ { next }
    { print }
  ' "$file")
  # Search for known external URLs in cleaned content
  MATCHES=$(echo "$CLEANED" | grep -E 'fonts.googleapis.com|fonts.gstatic.com|unpkg.com|cdnjs.|jsdelivr.|googleapis.com')
  if [[ -n "$MATCHES" ]]; then
    RESULT+="$file:\n"
    while IFS= read -r line; do
      RESULT+="  $line\n"
    done <<< "$MATCHES"
    RESULT+="\n"
  fi
done

if [[ -n "$RESULT" ]]; then
  echo "ERROR: Known external resource reference found in codebase:"
  printf "%b" "$RESULT"
  exit 1
else
  echo "No forbidden external web resource references found."
fi
