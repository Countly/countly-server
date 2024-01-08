#!/bin/bash

#Original source https://gist.github.com/vidavidorra/548ffbcdae99d752da02

echo "Starting documention deployment script"
GITHUB_BRANCH=${GITHUB_REF##*/}
echo "$GITHUB_HEAD_REF"
echo "Ref: $GITHUB_REF  Branch: $GITHUB_BRANCH  Repo: $GITHUB_REPOSITORY"

if [ -z "$GITHUB_HEAD_REF" ] && [ "$GITHUB_BRANCH" == "master" ] && [ "$GITHUB_REPOSITORY" == "Countly/countly-server" ]; then

echo "Action qualifies to be checked"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo 'Setting up the script...'
# Exit with nonzero exit code if anything fails
set -e

echo "Creating needed directories"
# Create a clean working directory for this script.
mkdir "$DIR/../../code_docs"
cd "$DIR/../../code_docs"

echo "Cloning gh-pages repo"
# Get the current gh-pages branch
git clone -b gh-pages "http://github.com/$GITHUB_REPOSITORY" repo
cd repo

echo "Configuring git"
##### Configure git.
# Set the push default to simple i.e. push only the current branch.
git config --global push.default simple
# Pretend to be an user called Github Actions.
git config user.name "Github Actions"
git config user.email "actions@github.com"

echo "Removing everything"
mkdir -p "./lite/$GITHUB_BRANCH"
# Remove everything currently in the gh-pages branch.
# GitHub is smart enough to know which files have changed and which files have
# stayed the same and will only update the changed files. So the gh-pages branch
# can be safely cleaned, and it is sure that everything pushed later is the new
# documentation.
rm -rf "./lite/$GITHUB_BRANCH/"*

# Need to create a .nojekyll file to allow filenames starting with an underscore
# to be seen on the gh-pages site. Therefore creating an empty .nojekyll file.
echo "" > "./lite/$GITHUB_BRANCH/.nojekyll"


echo "Generating documentation"
################################################################################
##### Generate JSDOC documents.          #####
echo 'Generating JSDoc code documentation...'
countly docs generate ;
mv "$DIR/../../"frontend/express/public/docs/* "./lite/$GITHUB_BRANCH"

################################################################################
##### Upload the documentation to the gh-pages branch of the repository.   #####
# Only upload if JSDoc successfully created the documentation.
# Check this by verifying that the file index.html exists
if [ -f "./lite/$GITHUB_BRANCH/index.html" ]; then

    echo 'Uploading documentation to the gh-pages branch...'
    # Add everything in this directory to the
    # gh-pages branch.
    # GitHub is smart enough to know which files have changed and which files have
    # stayed the same and will only update the changed files.
    git add --all

    # Commit the added files with a title and description containing the Travis CI
    # build number and the GitHub commit reference that issued this build.
    git commit -m "Deploy code docs to GitHub Pages build: ${GITHUB_RUN_ID}" -m "Commit: ${GITHUB_SHA}"

    # Force push to the remote gh-pages branch.
    # The ouput is redirected to /dev/null to hide any sensitive credential data
    # that might otherwise be exposed.
    git push --force "https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
else
    echo '' >&2
    echo 'Warning: No documentation (html) files have been found!' >&2
    echo 'Warning: Not going to push the documentation to GitHub!' >&2
    exit 1
fi

fi
