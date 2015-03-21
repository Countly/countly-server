DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if ! type "nodejs" > /dev/null; then
	node $DIR/install_plugins
else
	nodejs $DIR/install_plugins
fi
