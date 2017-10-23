'use strict';

var assert = require('chai').assert;
var TSLint = require('..');
var broccoli = require('broccoli');
var existsSync = require('exists-sync');
var fs = require('fs');

var builder;
describe('broccoli-tslinter', function() {
  var loggerOutput;

  function readFile(path) {
    return fs.readFileSync(path, {encoding: 'utf8'});
  }

  beforeEach(function() {
    loggerOutput = [];
  });

  afterEach(function() {
    if (builder) {
      builder.cleanup();
    }
  });

  it('providing non existent configuration file should result in error', function() {
    var willThrow = function() {
      var node = new TSLint('./tests/fixtures/errorFiles', {
        logError: function(message) {
          loggerOutput.push(message);
        },
        configuration: 'foo.json'
      });
      builder = new broccoli.Builder(node);
      return builder.build();
    };

    assert.throws(willThrow);
  });

  it('linting correct file should result in no lint errors', function() {
    var node = new TSLint('./tests/fixtures/lintedFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      }
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      assert.equal(loggerOutput.length, 0, 'No errors should be seen for linted files');
    });
  });

  it('linting error files should result in lint errors', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      }
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('linting error files with extends format should result in lint errors', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      configuration: './tests/fixtures/lintConfig/extends-format.json'
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('linting errors should be the same on subsequent runs', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      }
    });
    builder = new broccoli.Builder(node);

    return builder.build().then(function() {
      var errorsAfterFirstRun = loggerOutput.length;

      return builder.build().then(function() {
        assert.equal(loggerOutput.length, errorsAfterFirstRun, 'Error count should be the same on subsequent runs');
      });
    });
  });

  it('tests should be generated if files result in lint error', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      }
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      var dir = builder.outputPath;
      var testGenerated = readFile(dir + '/errorFile1.lint-test.js');
      assert.notEqual(testGenerated.indexOf("QUnit.test(\'errorFile1.ts should pass tslint\'"), -1, 'Test should be generated');
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('mocha tests should be generated when mocha is provided as the testGenerator', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      testGenerator: 'mocha'
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      var dir = builder.outputPath;
      var testGenerated = readFile(dir + '/errorFile1.lint-test.js');
      assert.notEqual(testGenerated.indexOf("it('errorFile1.ts should pass tslint', function() {"), -1, 'Mocha test should be generated');
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('tests should not be generated when disableTestGenerator is true', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      disableTestGenerator: true
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      var dir = builder.outputPath;
      var testGenerated = readFile(dir + '/errorFile1.lint-test.js');
      assert.equal(testGenerated.indexOf("QUnit.test(\'errorFile1.ts should pass tslint\'"), -1, 'Test should not be generated');
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('tests should be generated when disableTestGenerator is false', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      disableTestGenerator: false
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      var dir = builder.outputPath;
      var testGenerated = readFile(dir + '/errorFile2.lint-test.js');
      assert.notEqual(testGenerated.indexOf("QUnit.test(\'errorFile2.ts should pass tslint\'"), -1, 'Test should be generated');
      assert.notEqual(testGenerated.indexOf("assert.ok(false, \'errorFile2.ts should pass tslint"), -1, 'Generated test should not pass');
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('custom test generator function is set', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      testGenerator: function(relativePath, passed, errors) {
        return 'FOO IS GENERATED'
      }
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function(results) {
      var dir = builder.outputPath;
      var testGenerated = readFile(dir + '/errorFile1.lint-test.js');
      assert.notEqual(testGenerated.indexOf("FOO IS GENERATED"), -1, 'Test should not be generated');
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('providing custom configuration file should lint files', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      configuration: './tests/fixtures/lintConfig/customConfig.json'
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      assert.notEqual(loggerOutput.length, 0, 'Errors should be seen for linted files');
    });
  });

  it('should lint output to a file if output file is provided', function() {
    var outputFilePath = './tests/fixtures/output.txt';
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      outputFile: outputFilePath
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      assert.isOk(existsSync(outputFilePath), 'output file should exists');
    });
  });

  it('should throw an error when failBuild option is passed for error files', function() {
    var node = new TSLint('./tests/fixtures/errorFiles', {
      logError: function(message) {
        loggerOutput.push(message)
      },
      failBuild: true
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {}, function(error) {
      assert.include(error.toString(), 'BuildError: Build failed due to lint errors!');
    })
  });

  it('should not throw an error when failBuild option is passed for correct files', function() {
    var node = new TSLint('./tests/fixtures/lintedFiles', {
      logError: function(message) {
        loggerOutput.push(message);
      },
      failBuild: true
    });
    builder = new broccoli.Builder(node);
    return builder.build().then(function() {
      assert.equal(loggerOutput.length, 0);
    }, function(error) {
    });
  });
});
