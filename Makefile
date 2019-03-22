MOCHA:= ./node_modules/.bin/mocha
MOCHAEXEC:= ./node_modules/.bin/_mocha
ISTANBUL:= ./node_modules/istanbul/lib/cli.js
TESTPATH:= ./test/*.js
TYPEDOC:= ./node_modules/.bin/typedoc

test:
	tsc
	@NODE_ENV=test $(MOCHA) --trace-warnings --exit -u tdd -R spec

test-cover:
	echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@NODE_ENV=test ./node_modules/.bin/istanbul cover \
	./node_modules/mocha/bin/_mocha --report lcovonly -- -R spec && \
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js || true

docs:
	$(TYPEDOC)
	cp CNAME docs/

clean:
	rm -rf ./node_modules

.PHONY: test
.PHONY: docs
