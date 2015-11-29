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
  var file = fs.createWriteStream('job.js')
  job.pipe(file)
})
```

## API

### `new Printer([options])`

The Printer object can be initialized with either the printer name as a
string or an object containing:

- `name` - Name of the printer (defaults: `Node JS`)
- `port` - Port the printer should listen on (defaults to a random
  available port)
- `mirrorMinor` - Boolean. If `true` responses will mirror the minor IPP
  version used by the client. This shouldn't be necessary in a perfect
  world, but some versions of Windows doesn't like connecting to a
  server running a different version of the IPP protocol than it self
  (default: `true`)

Note that the IPP standard specifies port 631 as the default IPP port,
but most IPP clients are fine with connecting to another port.

### Event: job

```js
function (job) {}
```

Emitted each time a new job is sent to the printer. The `job` is a
readable stream of the document data being printed.

Each job object have the following attributes:

- `id` - The id of the job
- `state` - The job state
- `attributes` - The job attributes

Attributes example:

```js
[
  { tag: 0x45, name: 'job-printer-uri', value: 'ipp://watson.local.:3000/' },
  { tag: 0x45, name: 'job-uri', value: 'ipp://watson.local.:3000/1' },
  { tag: 0x42, name: 'job-name', value: 'My Document Title' },
  { tag: 0x42, name: 'job-originating-user-name', value: 'watson' },
  { tag: 0x44, name: 'job-state-reasons', value: 'none' },
  { tag: 0x21, name: 'time-at-creation', value: 40 },
  { tag: 0x47, name: 'attributes-charset', value: 'utf-8' },
  { tag: 0x48, name: 'attributes-natural-language', value: 'en-us' }
]
```

See the [ipp-encoder](https://github.com/watson/ipp-encoder) for an
explanation of the job states and tag values.

### Event: operation

```js
function (operation) {}
```

Emitted each time a new IPP operation is received. This event is more
low level than the job event as it will be emitted on all incoming IPP
operations.

This module currently supports the minimum set of operations required by
the IPP standard:

- print-job (0x02)
- validate-job (0x04)
- cancel-job (0x08)
- get-job-attribtes (0x09)
- get-jobs (0x0a)
- get-printer-attributes (0x0b)

The `operation` object have the following properties supplied by the
printer client:

- `version` - An object containing the major and minor IPP version of
  the request (e.g. `{ major: 1, minor: 1 }`)
- `operationId` - The id of the IPP operation
- `requestId` - The id of the IPP request
- `groups` - An array of IPP attribute groups

See the [ipp-encoder](https://github.com/watson/ipp-encoder) for an
explanation of the different operation types.

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

## Debugging

To see the communication between the client and the server, enable
debugging mode by setting the environment variable `DEBUG=ipp-printer`.

If you open an issue because the module crashes or if the client cannot
communicate properly with the printer it helps a lot if you attach the
client/server communication to the issue.

## License

MIT
