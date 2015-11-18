# ipp-printer

An IPP printer written in Node.js.

**This is work in progress!**

[![Build status](https://travis-ci.org/watson/ipp-printer.svg?branch=master)](https://travis-ci.org/watson/ipp-printer)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Installation

```
npm install ipp-printer
```

## Usage

```js
var Printer = require('ipp-printer')

var printer = new Printer('My Printer')

printer.on('job', function (job) {
  fs.writeFile('job.ps', job.data)
})
```

## License

MIT
