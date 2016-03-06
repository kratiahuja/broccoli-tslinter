var Filter = require('broccoli-filter');
var chalk = require('chalk');
var existsSync = require('exists-sync');
var path = require('path');
var Linter = require("tslint");
var fs = require('fs');

function TSLint(inputNode, options) {
  if (!(this instanceof TSLint)) {
    return new TSLint(inputNode, options);
  }
  options = options || {};

  this.options = {
    configuration: {
      rules: {}
    },
    outputFile: options.outputFile,
    failBuild: options.failBuild || false,
    logError: options.logError
  };
  this.totalFiles = 0;
  this.failureCount = 0;
  this._errors = [];

  var tslintConfigPath = path.resolve('tslint.json');
  if (options.configuration) {
    tslintConfigPath = path.resolve(options.configuration);
  } else {
    console.log(this.createLogMessage('Using tslint.json as the default file for linting rules', 'blue'));
  }

  if (!existsSync(tslintConfigPath)) {
    throw new Error('Cannot find tslint configuration file: ' + tslintConfigPath);
  }

  try {
    this.options.configuration = JSON.parse(fs.readFileSync(tslintConfigPath, 'utf8'));
  } catch (e) {
    var message = 'Cannot parse configuration file: ' + tslintConfigPath;
    throw new Error(this.createLogMessage(message, 'red'));
  }

  if (!this.options.configuration.rules) {
    // rules need to be defined in the configuration
    var message = 'The format of the config file is { rules: { /* rules list */ } }, where /* rules list */ is a key: value comma-seperated list of rulename: rule-options pairs.';
    throw new Error(this.createLogMessage(message, 'red'));
  }

  if (Object.keys(this.options.configuration.rules).length === 0) {
    var message = 'No rules defined for linting';
    console.log(this.createLogMessage(message, 'yellow'));
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
TSLint.prototype.targetExtension = 'ts';

TSLint.prototype.build = function () {
  var self = this;

  return Filter.prototype.build.call(this)
  .finally(function() {
    var outputLog = '';
    if (self.failureCount > 0) {
      // linting error in ts files
      var message = '======= Found ' + self.failureCount + ' tslint errors in ' + self.totalFiles + ' files =======';
      var summaryMessage = self.createLogMessage(message, 'yellow');
      self.logError(summaryMessage);
      outputLog += '\n' + self._errors.join('\n');
    } else {
      // all files are lint free
      outputLog += self.createLogMessage('Finished linting ' + self.totalFiles + ' successfully', 'green');
    }

    if (self.options.outputFile) {
      // write to file
      var outputPath = path.join(__dirname, self.options.outputFile);
      fs.writeFileSync(outputPath, outputLog, 'utf8');
      console.log(self.createLogMessage('Lint output written to file: ' + outputPath, 'blue'));
    } else {
      // throw in stdout
      console.log(outputLog);
      if (self.options.failBuild) {
        throw new Error('Build failed due to lint errors!');
      }
    }
  })
}

TSLint.prototype.processString = function(content, relativePath) {
  var linter = new Linter(relativePath, content, this.options);
  var result = linter.lint();

  this.totalFiles++;

  if (result.failureCount > 0) {
    // error is seen
    this.failureCount += result.failureCount;

    result.output.split("\n").forEach(function (line) {
      this.logError(line);
    }, this);
  }
  // don't touch the content files
  return content;
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
