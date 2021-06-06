#!/usr/bin/env bash
set -euo pipefail

PRECOMMIT="$(dirname "$0")/../../.git/hooks/pre-commit"

cat << 'EOF' > $PRECOMMIT
#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob
for filename in "$GIT_DIR/bin/dev-scripts/pre-commit-hooks/*.sh"; do
	bash $filename
done
EOF

chmod a+x $PRECOMMIT
