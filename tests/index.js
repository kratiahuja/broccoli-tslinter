'use strict';

var TSLint = require('..');
var path = require('path');
var broccoli = require('broccoli');
var co = require('co');
var testHelpers = require('broccoli-test-helper');
var existsSync = require('exists-sync');

var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
var expect = chai.expect;

var createBuilder = testHelpers.createBuilder;
var createTempDir = testHelpers.createTempDir;

var builder;

describe('broccoli-tslinter', function() {
  var input, output;
  var loggerOutput;

  beforeEach(co.wrap(function *() {
    loggerOutput = [];
    input = yield createTempDir();
  }));

  afterEach(co.wrap(function *() {
    yield input.dispose();
    if (output) {
      yield output.dispose();
    }
  }));

  it('providing non existent configuration file should result in error', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd";\n'
    });

    var willThrow = function() {
      output = createBuilder(new TSLint(input.path(), {
        logError: function(message) {
          loggerOutput.push(message);
        },
        configuration: 'foo.json'
      }));
    };

    expect(willThrow).to.throw;
  }));

  it('linting correct file should result in no lint errors', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd";\n'
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      }
    }));

    yield output.build();

    expect(loggerOutput).to.have.lengthOf(0);
  }));

  it('linting error files should result in lint errors', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      }
    }));

    yield output.build();

    expect(loggerOutput.join('\n'))
      .to.contain(`a.ts[1, 17]: trailing whitespace\n`)
      .to.contain(`a.ts[1, 18]: file should end with a newline\n`);
  }));

  it('linting error files with extends format should result in lint errors', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; ',
      'tslint.json': '{ "extends": "tslint:recommended" }'
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      configuration: path.join(input.path(), './tslint.json')
    }));

    yield output.build();

    expect(loggerOutput).to.not.have.lengthOf(0);
  }));

  it('linting errors should be the same on subsequent runs', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      }
    }));

    yield output.build();
    const firstOutput = loggerOutput.slice();

    yield output.build();

    expect(firstOutput).to.deep.equal(loggerOutput);
  }));

  it('tests should be generated if files result in lint error', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      }
    }));

    yield output.build();

    let result = output.read();

    expect(Object.keys(result)).to.deep.equal(['a.lint-test.js']);
    expect(result['a.lint-test.js'].trim()).to.equal([
      `QUnit.module('TSLint - .');`,
      `QUnit.test('a.ts should pass tslint', function(assert) {`,
      `  assert.expect(1);`,
      `  assert.ok(false, 'a.ts should pass tslint.\\\\n\\\\nERROR: a.ts[1, 17]: trailing whitespace\\\\nERROR: a.ts[1, 18]: file should end with a newline\\\\n');`,
      `});`,
    ].join('\n'));
  }));

  it('mocha tests should be generated when mocha is provided as the testGenerator', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      testGenerator: 'mocha'
    }));

    yield output.build();

    let result = output.read();

    expect(Object.keys(result)).to.deep.equal(['a.lint-test.js']);
    expect(result['a.lint-test.js'].trim()).to.equal([
      `describe('TSLint - .', function() {`,
      `  it('a.ts should pass tslint', function() {`,
      `    // test failed`,
      `    var error = new chai.AssertionError('a.ts should pass tslint.\\\\n\\\\nERROR: a.ts[1, 17]: trailing whitespace\\\\nERROR: a.ts[1, 18]: file should end with a newline\\\\n');`,
      `    error.stack = undefined;`,
      `    throw error;`,
      `  });`,
    ].join('\n'));
  }));

  it('tests should not be generated when disableTestGenerator is true', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      disableTestGenerator: true
    }));

    yield output.build();

    let result = output.read();

    expect(Object.keys(result)).to.deep.equal(['a.lint-test.js']);
    expect(result['a.lint-test.js'].trim()).to.be.empty;
  }));

  it('tests should be generated when disableTestGenerator is false', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      disableTestGenerator: false
    }));

    yield output.build();

    let result = output.read();

    expect(Object.keys(result)).to.deep.equal(['a.lint-test.js']);
    expect(result['a.lint-test.js'].trim()).to.equal([
      `QUnit.module('TSLint - .');`,
      `QUnit.test('a.ts should pass tslint', function(assert) {`,
      `  assert.expect(1);`,
      `  assert.ok(false, 'a.ts should pass tslint.\\\\n\\\\nERROR: a.ts[1, 17]: trailing whitespace\\\\nERROR: a.ts[1, 18]: file should end with a newline\\\\n');`,
      `});`,
    ].join('\n'));
  }));

  it('tests should be generated when disableTestGenerator is false', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      testGenerator(relativePath, passed, errors) {
        return 'FOO IS GENERATED'
      }
    }));

    yield output.build();

    let result = output.read();

    expect(Object.keys(result)).to.deep.equal(['a.lint-test.js']);
    expect(result['a.lint-test.js'].trim()).to.equal('FOO IS GENERATED');
  }));

  it('providing custom configuration file should lint files', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; ',
      'tslint.json': ' { "rules": { "no-var-keyword": true } }'
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      configuration: path.join(input.path(), './tslint.json')
    }));

    yield output.build();

    expect(loggerOutput.join('\n'))
      .to.contain(`a.ts[1, 1]: Forbidden 'var' keyword, use 'let' or 'const' instead\n`)
  }));

  it('should lint output to a file if output file is provided', co.wrap(function *() {
    var outputFilePath = './tests/fixtures/output.txt';

    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      outputFile: outputFilePath
    }));

    yield output.build();

    expect(existsSync(outputFilePath)).to.be.ok;
  }));

  it('should throw an error when failBuild option is passed for error files', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd"; '
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      failBuild: true
    }));

    yield expect(output.build()).to.be.rejectedWith('Build failed due to lint errors!');
  }));

  it('should not throw an error when failBuild option is passed for correct files', co.wrap(function *() {
    input.write({
      'a.ts': 'var Xx = "abcd";\n'
    });

    output = createBuilder(new TSLint(input.path(), {
      logError(message) {
        loggerOutput.push(message);
      },
      failBuild: true
    }));

    yield expect(output.build()).to.be.fulfilled;
  }));

});
