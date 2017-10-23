# Broccoli TSLinter [![npm version](https://badge.fury.io/js/broccoli-tslinter.svg)](https://badge.fury.io/js/broccoli-tslinter)

[![Greenkeeper badge](https://badges.greenkeeper.io/kratiahuja/broccoli-tslinter.svg)](https://greenkeeper.io/)

Broccoli plugin for linting typescript files. Uses [tslint](https://github.com/palantir/tslint) to lint the files.

## Installation

```
npm install broccoli-tslinter
```

## Usage
Please ensure that the TypeScript source files compile correctly _before_ running the linter.

```javascript
var TSLint = require('broccoli-tslinter');

// someNode is a broccoli node or a string representing a folder containing all .ts files
var node = new TSLint(someNode);
```

## Documentation

### `new TSLint(someNode, options)`

---

`options.configuration` *{String}*

Specify the path for the lint configuration file containing all the rules described [here](https://github.com/palantir/tslint#core-rules)

Default: **uses the file tslint.json (in the root directory of your project)**

---

`options.outputFile` *{String}*

Specify the path of the file where the detailed linting results will be present.

Default: **lint-test.js**

---

`options.failBuild` *{true|false}*

Should we fail the build if there are linting errors?

Default: **false**

---

`options.disableTestGenerator` *{true|false}*

Disable generating tests for each file linted

Default: **false**

---

`options.testGenerator` *{Function|String}*

The function used to generate test modules. You can provide a custom function for your client side testing framework of choice.

The function receives the following arguments:

* `relativePath` - The relative path to the file being tested.
* `passed` - If the linting passed (true/false)
* `errors` - A generated string of errors found.

You can also provide a string to use one of the predefined test generators. Currently  `qunit` and `mocha` are supported.

Default generates QUnit style tests.

---

`options.annotation` *{String}*

A human-readable description for this plugin instance.

Default: **undefined**

## Contributing
Update the version in package.json

```javascript
npm install
npm run test
```

## License

This project is distributed under the MIT license.
