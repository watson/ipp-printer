'use strict'

var util = require('util')
var os = require('os')
var http = require('http')
var EventEmitter = require('events').EventEmitter
var bonjour = require('bonjour')
var ipp = require('ipp-encoder')
var utils = require('./lib/utils')
var groups = require('./lib/groups')
var operations = require('./lib/operations')

var C = ipp.CONSTANTS

module.exports = Printer

function Printer (opts) {
  if (!(this instanceof Printer)) return new Printer(opts)
  if (!opts) opts = { name: 'Node.js' }
  else if (typeof opts === 'string') opts = { name: opts }

  EventEmitter.call(this)

  this.started = Date.now()
  this.jobs = []
  this._jobId = 0
  this.name = opts.name
  this.attributes = [
    { tag: C.URI, name: 'printer-uri-supported', value: this.uri },
    { tag: C.KEYWORD, name: 'uri-security-supported', value: 'none' }, // none, ssl3, tls
    { tag: C.KEYWORD, name: 'uri-authentication-supported', value: 'none' }, // none, requesting-user-name, basic, digest, certificate
    { tag: C.NAME_WITH_LANG, name: 'printer-name', value: this.name },
    { tag: C.ENUM, name: 'printer-state', value: C.PRINTER_IDLE },
    { tag: C.KEYWORD, name: 'printer-state-reasons', value: 'none' },
    { tag: C.KEYWORD, name: 'ipp-versions-supported', value: '1.1' }, // 1.0, 1.1
    { tag: C.ENUM, name: 'operations-supported', values: [C.PRINT_JOB, C.VALIDATE_JOB, C.GET_JOBS, C.GET_PRINTER_ATTRIBUTES, C.CANCEL_JOB, C.GET_JOB_ATTRIBUTES] }, // C.PRINT_JOB, C.PRINT_URI, C.VALIDATE_JOB, C.CREATE_JOB, C.SEND_DOCUMENT, C.SEND_URI, C.CANCEL_JOB, C.GET_JOB_ATTRIBUTES, C.GET_JOBS, C.GET_PRINTER_ATTRIBUTES, C.HOLD_JOB, C.RELEASE_JOB, C.RESTART_JOB, C.PAUSE_PRINTER, C.RESUME_PRINTER, C.PURGE_JOBS
    { tag: C.CHARSET, name: 'charset-configured', value: 'utf-8' },
    { tag: C.CHARSET, name: 'charset-supported', value: 'utf-8' },
    { tag: C.NATURAL_LANG, name: 'natural-language-configured', value: 'en-us' },
    { tag: C.NATURAL_LANG, name: 'generated-natural-language-supported', value: 'en-us' },
    { tag: C.MIME_MEDIA_TYPE, name: 'document-format-default', value: 'application/postscript' },
    { tag: C.MIME_MEDIA_TYPE, name: 'document-format-supported', values: ['text/html', 'text/plain', 'application/vnd.hp-PCL', 'application/octet-stream', 'application/pdf', 'application/postscript'] },
    { tag: C.BOOLEAN, name: 'printer-is-accepting-jobs', value: true },
    { tag: C.INTEGER, name: 'queued-job-count', value: jobCount },
    { tag: C.KEYWORD, name: 'pdl-override-supported', value: 'not-attempted' }, // attempted, not-attempted
    { tag: C.INTEGER, name: 'printer-up-time', value: utils.time.bind(null, this) },
    { tag: C.KEYWORD, name: 'compression-supported', value: 'none' } // none, deflate, gzip, compress
  ]

  var self = this
  var server = http.createServer()

  server.on('request', handleRequest.bind(null, this))

  server.listen(opts.port, function () {
    var port = server.address().port
    console.log('IPP printer listening on port', port)
    bonjour.tcp.publish({ type: 'ipp', port: port, name: self.name }, function (err) {
      if (err) throw err
      console.log('Bonjour agent running...')
    })
  })

  function jobCount () {
    return self.jobs.length
  }
}

util.inherits(Printer, EventEmitter)

Printer.prototype.uri = function () {
  return 'ipp://' + os.hostname() + '.:' + this.port + '/'
}

Printer.prototype.getJob = function (id) {
  for (var i = 0, l = this.jobs.length; i < l; i++) {
    if (this.jobs[i].id === id) return this.jobs[i]
  }
}

function handleRequest (printer, req, res) {
  console.log('-----------------------')
  console.log(req.method, req.url)
  console.log(req.headers)

  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end()
    return
  } else if (req.headers['content-type'] !== 'application/ipp') {
    res.writeHead(400)
    res.end()
    return
  }

  res.send = send.bind(null, req, res)

  var buffers = []
  req.on('data', buffers.push.bind(buffers))
  req.on('end', function () {
    var data = Buffer.concat(buffers)

    req.body = ipp.request.decode(data)

    if (req.body.version.major !== 1) {
      res.send(C.SERVER_ERROR_VERSION_NOT_SUPPORTED)
    } else {
      switch (req.body.operationId) {
        // Printer Operations
        case C.PRINT_JOB: return operations.printJob(printer, req, res)
        case C.VALIDATE_JOB: return operations.validateJob(printer, req, res)
        case C.GET_PRINTER_ATTRIBUTES: return operations.getPrinterAttributes(printer, req, res)
        case C.GET_JOBS: return operations.getJobs(printer, req, res)
        case C.PRINT_URI:
        case C.CREATE_JOB:
        case C.PAUSE_PRINTER:
        case C.RESUME_PRINTER:
        case C.PURGE_JOBS: throw new Error('Unsupported operation id')

        // Job Operations
        case C.CANCEL_JOB: return operations.cancelJob(printer, req, res)
        case C.GET_JOB_ATTRIBUTES: return operations.getJobAttributes(printer, req, res)
        case C.SEND_DOCUMENT:
        case C.SEND_URI:
        case C.HOLD_JOB:
        case C.RELEASE_JOB:
        case C.RESTART_JOB: throw new Error('Unsupported operation id')

        default: throw new Error('Unknown operation id')
      }
    }
  })
}

function send (req, res, statusCode, _groups) {
  if (typeof statusCode === 'object') return send(req, res, C.SUCCESSFUL_OK, statusCode)
  if (statusCode === undefined) statusCode = C.SUCCESSFUL_OK

  var obj = {}
  obj.statusCode = statusCode
  obj.requestId = req.body.requestId
  obj.groups = [groups.operationAttributesTag(ipp.STATUS_CODES[statusCode])]
  if (_groups) obj.groups = obj.groups.concat(_groups)

  console.log('--> encoding', require('util').inspect(obj, { depth: null }))
  var buf = ipp.response.encode(obj)

  res.writeHead(200, {
    'Content-Length': buf.length,
    'Content-Type': 'application/ipp'
  })

  res.end(buf)
}
