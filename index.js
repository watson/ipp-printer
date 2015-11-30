'use strict'

var util = require('util')
var os = require('os')
var http = require('http')
var EventEmitter = require('events').EventEmitter
var bonjour = require('bonjour')
var ipp = require('ipp-encoder')
var debug = require('debug')(require('./package').name)
var utils = require('./lib/utils')
var groups = require('./lib/groups')
var operations = require('./lib/operations')

var C = ipp.CONSTANTS

module.exports = Printer

function Printer (opts) {
  if (!(this instanceof Printer)) return new Printer(opts)
  if (!opts) opts = { name: 'Node JS' }
  else if (typeof opts === 'string') opts = { name: opts }
  if (!('fallback' in opts)) opts.fallback = true

  EventEmitter.call(this)

  this.started = Date.now()
  this.jobs = []
  this._jobId = 0
  this.name = opts.name
  this.fallback = opts.fallback
  this.attributes = [
    { tag: C.URI, name: 'printer-uri-supported', value: this.uri },
    { tag: C.KEYWORD, name: 'uri-security-supported', value: 'none' }, // none, ssl3, tls
    { tag: C.KEYWORD, name: 'uri-authentication-supported', value: 'none' }, // none, requesting-user-name, basic, digest, certificate
    { tag: C.NAME_WITH_LANG, name: 'printer-name', value: { lang: 'en-us', value: this.name } },
    { tag: C.ENUM, name: 'printer-state', value: C.PRINTER_IDLE },
    { tag: C.KEYWORD, name: 'printer-state-reasons', value: 'none' },
    { tag: C.KEYWORD, name: 'ipp-versions-supported', value: '1.1' }, // 1.0, 1.1
    { tag: C.ENUM, name: 'operations-supported', values: [C.PRINT_JOB, C.VALIDATE_JOB, C.GET_JOBS, C.GET_PRINTER_ATTRIBUTES, C.CANCEL_JOB, C.GET_JOB_ATTRIBUTES] },
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

  this.server = http.createServer(function handleRequest (req, res) {
    debug('HTTP request: %s %s', req.method, req.url)

    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end()
      return
    } else if (req.headers['content-type'] !== 'application/ipp') {
      res.writeHead(400)
      res.end()
      return
    }

    req.on('data', consumeAttrGroups)
    req.on('end', fail)

    function consumeAttrGroups (chunk) {
      req._body = req._body ? Buffer.concat([req._body, chunk]) : chunk

      try {
        req._body = ipp.request.decode(req._body)
      } catch (e) {
        debug('incomplete IPP body - waiting for more data...')
        return
      }

      req.removeListener('data', consumeAttrGroups)
      req.removeListener('end', fail)

      self.emit('operation', req._body)
      router(self, req, res)
    }

    function fail () {
      // decode only the most essential part of the IPP request header to allow
      // best possible response
      if (req._body.length >= 8) {
        var body = {
          version: { major: req._body.readInt8(0), minor: req._body.readInt8(1) },
          operationId: req._body.readInt16BE(2),
          requestId: req._body.readInt32BE(4)
        }
      }
      send(self, body, res, C.CLIENT_ERROR_BAD_REQUEST)
    }
  })

  this.server.listen(opts.port, function () {
    self.port = self.server.address().port
    debug('IPP printer "%s" listening on port %s', self.name, self.port)
    bonjour.tcp.publish({ type: 'ipp', port: self.port, name: self.name })
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

function router (printer, req, res) {
  var body = req._body

  debug('IPP/%d.%d operation %d (request #%d)',
    body.version.major,
    body.version.minor,
    body.operationId,
    body.requestId,
    util.inspect(body.groups, { depth: null }))

  res.send = send.bind(null, printer, body, res)

  if (body.version.major !== 1) return res.send(C.SERVER_ERROR_VERSION_NOT_SUPPORTED)

  switch (body.operationId) {
    // Printer Operations
    case C.PRINT_JOB: return operations.printJob(printer, req, res)
    case C.VALIDATE_JOB: return operations.validateJob(printer, req, res)
    case C.GET_PRINTER_ATTRIBUTES: return operations.getPrinterAttributes(printer, req, res)
    case C.GET_JOBS: return operations.getJobs(printer, req, res)

    // Job Operations
    case C.CANCEL_JOB: return operations.cancelJob(printer, req, res)
    case C.GET_JOB_ATTRIBUTES: return operations.getJobAttributes(printer, req, res)

    default: res.send(C.SERVER_ERROR_OPERATION_NOT_SUPPORTED)
  }
}

function send (printer, req, res, statusCode, _groups) {
  if (typeof statusCode === 'object') return send(printer, req, res, C.SUCCESSFUL_OK, statusCode)
  if (statusCode === undefined) statusCode = C.SUCCESSFUL_OK

  var obj = {}
  if (printer.fallback && req && req.version.major === 1 && req.version.minor === 0) obj.version = { major: 1, minor: 0 }
  obj.statusCode = statusCode
  obj.requestId = req ? req.requestId : 0
  obj.groups = [groups.operationAttributesTag(ipp.STATUS_CODES[statusCode])]
  if (_groups) obj.groups = obj.groups.concat(_groups)

  debug('responding to request #%d', obj.requestId, util.inspect(obj, { depth: null }))

  var buf = ipp.response.encode(obj)

  res.writeHead(200, {
    'Content-Length': buf.length,
    'Content-Type': 'application/ipp'
  })

  res.end(buf)
}
