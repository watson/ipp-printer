# ipp-printer

**Create a printer on your network using nothing but Node.js**. This
module implements version 1.1 of the
[IPP](https://en.wikipedia.org/wiki/Internet_Printing_Protocol) protocol
and uses [Bonjour](https://github.com/watson/bonjour) to advertise a
printer on your local network that anyone can print to.

*This module is still work in progress!*

![ipp-printer](https://raw.githubusercontent.com/watson/ipp-printer/master/ipp-printer.gif)

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

## API

### `new Printer([options])`

The Printer object can be initialized with either the printer name as a
string or an object containing:

- `name` - Optional name of the printer (defaults to `Node JS`)
- `port` - Optional port the printer should listen on (defaults to a
  random available port)

Note that the IPP standard specifies port 631 as the default IPP port,
but most IPP clients are fine with connecting to another port.

### Event: job

```js
function (job) {}
```

Emitted each time a new job is ready. The actual document data will be
available via `job.data`.

Job object example:

```js
{
  id: 1,
  state: 9,
  data: <Buffer 25 21 50 ...>,
  attributes: [
    { tag: 69, name: 'job-printer-uri', value: 'ipp://watson.local.:3000/' },
    { tag: 69, name: 'job-uri', value: 'ipp://watson.local.:3000/1' },
    { tag: 66, name: 'job-name', value: 'My Document Title' },
    { tag: 66, name: 'job-originating-user-name', value: 'watson' },
    { tag: 68, name: 'job-state-reasons', value: 'none' },
    { tag: 33, name: 'time-at-creation', value: 40 },
    { tag: 71, name: 'attributes-charset', value: 'utf-8' },
    { tag: 72, name: 'attributes-natural-language', value: 'en-us' }
  ],
  processingAt: 1447830263340,
  completedAt: 1447830263340
}
```

See the [ipp-encoder](https://github.com/watson/ipp-encoder) for an
explanation of the tag values.

### Event: request

```js
function (request) {}
```

Emitted each time a new IPP request is received. The request body is
available via `request.body`.

### Event: error

```js
function (error) {}
```

Emitted if the IPP printer encounters an error.

### `printer.name`

The printer name.

### `printer.port`

The port of the printer is listening on.

### `printer.jobs`

An array of all jobs handled by the printer.

### `printer.server`

An instance of [`http.Server`](https://nodejs.org/api/http.html#http_class_http_server).

## License

MIT
