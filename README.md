# ipp-printer

**Create a printer on your network using nothing but Node.js**. This
module implements version 1.1 of the
[IPP](https://en.wikipedia.org/wiki/Internet_Printing_Protocol) protocol
and uses [Bonjour/Zeroconf](https://github.com/watson/bonjour) to advertise a
printer on your local network that anyone can print to.

For a video introduction, check out the talk I gave at [Node.js
Interactive 2015](https://www.youtube.com/watch?v=58Ti8w1yX2w) in
Portland.

![ipp-printer](https://raw.githubusercontent.com/watson/ipp-printer/master/ipp-printer.gif)

[![Build status](https://travis-ci.org/watson/ipp-printer.svg?branch=master)](https://travis-ci.org/watson/ipp-printer)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Project Status

This module have been confirmed to work with both OS X and Windows
clients. But if you experience any problems please don't hesitate to
[open an issue](https://github.com/watson/ipp-printer/issues).

Be aware that this module currently doesn't support any of the security
features build into IPP, so don't print anything you don't want others
to know on an open network.

## Installation

Install globally to use CLI:

```
npm install ipp-printer -g
```

Or install locally to use in your project:

```
npm install ipp-printer --save
```

## CLI Usage

Just run:

```
$ ipp-printer
```

The printer will now advertise it self on the network using
Bonjour/Zeroconf and write all jobs to the current working directory.

## Programmatic Usage

```js
var fs = require('fs')
var Printer = require('ipp-printer')

var printer = new Printer('My Printer')

printer.on('job', function (job) {
  console.log('[job %d] Printing document: %s', job.id, job.name)

  var filename = 'job-' + job.id + '.ps' // .ps = PostScript
  var file = fs.createWriteStream(filename)

  job.on('end', function () {
    console.log('[job %d] Document saved as %s', job.id, filename)
  })

  job.pipe(file)
})
```

## API

### Class: Printer

#### `new Printer([options])`

The Printer object can be initialized with either the printer name as a
string or an object containing:

- `name` - Name of the printer (default: `Node JS`)
- `port` - Port the printer should listen on (defaults to a random
  available port)
- `zeroconf` - Boolean. If `true`, the printer will advertise it self on
  the network using Bonjour/Zeroconf for easier setup (default: `true`)
- `fallback` - Boolean. If `true`, responses to IPP/1.0 requests will
  identify them selfs as coming from an IPP/1.0 server. This shouldn't
  be necessary in a perfect world, but some versions of Windows doesn't
  like connecting to a server running a different version of the IPP
  protocol than it self (default: `true`)

Note that the IPP standard specifies port 631 as the default IPP port,
but most IPP clients are fine with connecting to another port.

#### Event: job

```js
function (job) {}
```

Emitted each time a new job is sent to the printer. The `job` is an
instance of the [Job class](#class-job).

Example writing a print job document to a file:

```js
printer.on('job', function (job) {
  var filename = 'job-' + job.id + '.ps' // expect Postscript
  var file = fs.createWriteStream(filename)
  job.on('end', function () {
    console.log('written job to', filename)
  })
  job.pipe(file)
})
```

#### Event: operation

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

#### `printer.name`

The printer name.

#### `printer.port`

The port of the printer is listening on.

#### `printer.jobs`

An array of all jobs handled by the printer.

#### `printer.server`

An instance of [`http.Server`](https://nodejs.org/api/http.html#http_class_http_server).

### Class: Job

A job is a readable stream containing the document to be printed. In
many cases this will be in Postscript format.

#### Event: cancel

```js
function () {}
```

Emitted if the job is cancelled prior to completion.

#### Event: abort

```js
function () {}
```

Emitted if the job is aborted prior to completion.

#### Event: error

```js
function (error) {}
```

Emitted if the job encounters an error.

#### `job.id`

The id of the job.

#### `job.state`

The job state.

See the [ipp-encoder](https://github.com/watson/ipp-encoder) for an
explanation of the job states.

#### `job.uri`

The job URI.

#### `job.name`

The document name.

#### `job.userName`

The name of the requesting user.

#### `job.attributes([filter])`

Returns an array of job attributes.

If an array of attribute names or attribute groups is given as the first
argument, the returned array will only include the attributes maching
the supplied names or groups.

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
explanation of the tag values.

## Debugging

To see the communication between the client and the server, enable
debugging mode by setting the environment variable `DEBUG=ipp-printer`.

If you open an issue because the module crashes or if the client cannot
communicate properly with the printer it helps a lot if you attach the
client/server communication to the issue.

## License

MIT
