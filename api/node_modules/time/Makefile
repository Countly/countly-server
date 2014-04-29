MOCHA ?= ./node_modules/.bin/mocha

all: clean configure build

clean:
	node-gyp clean

configure:
	node-gyp configure

build:
	node-gyp build

test:
	$(MOCHA) --reporter spec

.PHONY: clean configure build test
