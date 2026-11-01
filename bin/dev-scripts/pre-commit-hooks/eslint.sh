#!/usr/bin/env bash

if command -v eslint &> /dev/null
then
	ESLINT=(eslint)
elif command -v npx &> /dev/null
then
	ESLINT=(npx eslint)
else
	echo "✘ ESLint not found! Either install it globally, or install npx."
	exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"

FILES=()
while IFS= read -r -d '' f; do
	FILES+=("$f")
done < <(git diff --diff-filter=d --cached --name-only -z -- '*.js' '*.mjs' '*.cjs')

if [ ${#FILES[@]} -eq 0 ]; then
	echo "✓ ESLint passed :)"
	exit 0
fi

# Lint what the commit will contain, not the working tree. ESLint applies
# eslint-suppressions.json only to files it reads from disk (not to --stdin), so the
# staged versions are written out, with the staged config, suppressions and local
# rules, to a temporary directory laid out like the repository, and linted there.
SNAPSHOT="$(mktemp -d)"
trap 'rm -rf "$SNAPSHOT"' EXIT

CONFIG=()
while IFS= read -r -d '' f; do
	CONFIG+=("$f")
done < <(git ls-files -z -- eslint.config.mjs eslint-suppressions.json bin/eslint-rules)

git checkout-index --prefix="$SNAPSHOT/" -- "${CONFIG[@]}" "${FILES[@]}"
ln -s "$ROOT/node_modules" "$SNAPSHOT/node_modules"

(cd "$SNAPSHOT" && "${ESLINT[@]}" --pass-on-unpruned-suppressions "${FILES[@]}")
ESLINT_STATUS=$?

if [ $ESLINT_STATUS -eq 0 ]; then
	echo "✓ ESLint passed :)"
else
	echo "✘ ESLint failed :(" 1>&2
	exit $ESLINT_STATUS
fi
