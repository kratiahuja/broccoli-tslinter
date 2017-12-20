var Filter = require('broccoli-persistent-filter');
var chalk = require('chalk');
var existsSync = require('exists-sync');
var path = require('path');
var Linter = require('tslint').Linter;
var Configuration = require('tslint').Configuration;
var fs = require('fs');
var testGenerators = require('aot-test-generators');

function TSLint(inputNode, options) {
  if (!(this instanceof TSLint)) {
    return new TSLint(inputNode, options);
  }
  options = options || {};

  this.options = {
    outputFile: options.outputFile,
    failBuild: options.failBuild || false,
    disableTestGenerator: options.disableTestGenerator || false,
    testGenerator: options.testGenerator || null,
    logError: options.logError
  };

  this.tslintConfigPath = 'tslint.json';
  if (options.configuration) {
    this.tslintConfigPath = options.configuration;
  } else {
    console.log(this.createLogMessage('Using tslint.json as the default file for linting rules', 'blue'));
  }

  if (!existsSync(this.tslintConfigPath)) {
    throw new Error('Cannot find tslint configuration file: ' + tslintConfigPath);
  }

  if (!options.formatter) {
    // default formatter
    this.options.formatter = 'prose';
  }

  Filter.call(this, inputNode, {
    annotation: options.annotation
  });
}

TSLint.prototype = Object.create(Filter.prototype);
TSLint.prototype.constructor = TSLint;
// only touch typescript files
TSLint.prototype.extensions = ['ts'];
TSLint.prototype.targetExtension = 'lint-test.js';

TSLint.prototype.build = function () {
  this.totalFiles = 0;
  this.errorCount = 0;
  this._errors = [];

  var self = this;

  return Filter.prototype.build.call(this)
  .finally(function() {
    var outputLog = '';
    if (self.errorCount > 0) {
      // linting error in ts files
      var message = '======= Found ' + self.errorCount + ' tslint errors in ' + self.totalFiles + ' files =======';
      var summaryMessage = self.createLogMessage(message, 'yellow');
      self.logError(summaryMessage);
      outputLog += '\n' + self._errors.join('\n');
    } else {
      // all files are lint free
      outputLog += self.createLogMessage('Finished linting ' + self.totalFiles + ' successfully', 'green');
    }

    if (self.options.outputFile) {
      // write to file
      var outputPath = path.join(self.options.outputFile);
      fs.writeFileSync(outputPath, outputLog, 'utf8');
      console.log(self.createLogMessage('Lint output written to file: ' + outputPath, 'blue'));
    } else {
      // throw in stdout
      console.log(outputLog);
      if (self.options.failBuild && self.errorCount > 0) {
        throw new Error('Build failed due to lint errors!');
      }
    }
  })
}

TSLint.prototype.processString = function(content, relativePath) {
  var linter = new Linter(this.options);
  var configLoad = Configuration.findConfiguration(this.tslintConfigPath, relativePath);
  linter.lint(relativePath, content, configLoad.results);
  var result = linter.getResult();

  this.totalFiles++;

  var passed = result.errorCount === 0;
  var errors = [];
  if (!passed) {
    // error is seen
    this.errorCount += result.errorCount;

    errors = result.failures.map((failure) => {
      var position = failure.startPosition.lineAndCharacter;
      var line = position.line + 1;
      var character = position.character + 1;
      return `${failure.ruleSeverity.toUpperCase()}: ${failure.fileName}[${line}, ${character}]: ${failure.failure} (${failure.ruleName})`;
    });

    errors.forEach((line) => this.logError(line));
  }

  var output = '';
  if (!this.options.disableTestGenerator) {
    output = this.testGenerator(relativePath, passed, errors.join('\n'))
  }

  return {
    output: output,
    didPass: passed,
    errors: errors.join('\n')
  }
};

TSLint.prototype.testGenerator = function(relativePath, passed, errors) {
  if (errors) {
    errors = '\\n' + this.escapeErrorString(errors);
  } else {
    errors = '';
  }

  if (typeof this.options.testGenerator === 'function') {
    return this.options.testGenerator.call(this, relativePath, passed, errors);
  } else {
    var generatorName = this.options.testGenerator || 'qunit';
    var output = testGenerators[generatorName].suiteHeader('TSLint - ' + path.dirname(relativePath));
    output += testGenerators[generatorName].test(relativePath + ' should pass tslint', !!passed, relativePath + ' should pass tslint.' + errors);

    return output;
  }
};

TSLint.prototype.escapeErrorString = function(string) {
  string = string.replace(/\n/gi, "\\n");
  string = string.replace(/'/gi, "\\'");

  return string;
};

TSLint.prototype.createLogMessage = function(message, color) {
  return chalk[color](message);
}

TSLint.prototype.logError = function(errorMsg, color) {
  var color = color || 'red';

  this._errors.push(chalk[color](errorMsg));

  if (this.options.logError) {
    // custom log error function for tests
    this.options.logError.call(this, errorMsg);
  }
}

module.exports = TSLint;
