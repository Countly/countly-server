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

# Lint by path, not via --stdin: ESLint applies eslint-suppressions.json only to files it reads from disk.
git diff --diff-filter=d --cached --name-only -z -- '*.js' '*.mjs' '*.cjs' \
	| xargs -0 "${ESLINT[@]}" --pass-on-unpruned-suppressions
ESLINT_STATUS=$?

if [ $ESLINT_STATUS -eq 0 ]; then
	echo "✓ ESLint passed :)"
else
	echo "✘ ESLint failed :(" 1>&2
	exit $ESLINT_STATUS
fi
