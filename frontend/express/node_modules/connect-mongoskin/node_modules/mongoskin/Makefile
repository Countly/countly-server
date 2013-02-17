TESTS = test/
TESTTIMEOUT = 60000
REPORTER = spec
MOCHA_OPTS =
PROJECT_DIR = $(shell pwd)
MONGOSKIN_REPLICASET = false
JSCOVERAGE = ./node_modules/jscover/bin/jscover
SUPPORT_VERSIONS := \
	1.0.0 1.0.1 1.0.2 \
	1.1.0-beta 1.1.1 1.1.2 1.1.3 1.1.4

test:
	@npm install
	@if ! test -d deps/mongodb; then \
		git clone git://github.com/mongodb/node-mongodb-native.git deps/mongodb; \
	fi
	@cd deps/mongodb && npm install && git pull && cd ../..
	@NODE_ENV=test MONGOSKIN_REPLICASET=$(MONGOSKIN_REPLICASET) \
		./node_modules/mocha/bin/mocha --recursive \
		--reporter $(REPORTER) --timeout $(TESTTIMEOUT) \
		$(MOCHA_OPTS) $(TESTS)

test-debug:
	@$(MAKE) test MOCHA_OPTS="--debug-brk"

test-replicaset:
	@$(MAKE) test MONGOSKIN_REPLICASET=true

lib-cov:
	@rm -rf $@
	@$(JSCOVERAGE) lib $@

test-cov: lib-cov
	@MONGOSKIN_COV=1 $(MAKE) test REPORTER=dot
	@MONGOSKIN_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@$(MAKE) test REPORTER=markdown > test_results.md

test-version:
	@for version in $(SUPPORT_VERSIONS); do \
		echo "test with mongodb@$$version"; \
		npm install mongodb@$$version --loglevel=warn; \
		$(MAKE) test REPORTER=dot; \
	done

.PHONY: test-replicaset test-version test-cov test lib-cov
