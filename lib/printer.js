'use strict'

var util = require('util')
var EventEmitter = require('events').EventEmitter
var debug = require('debug')(require('../package').name)
var ipp = require('ipp-encoder')
var utils = require('./utils')
var bind = require('./bind')

var C = ipp.CONSTANTS

module.exports = Printer

function Printer (opts) {
  if (!(this instanceof Printer)) return new Printer(opts)
  if (!opts) opts = { name: 'Node JS' }
  else if (typeof opts === 'string') opts = { name: opts }
  if (!('zeroconf' in opts)) opts.zeroconf = true
  if (!('fallback' in opts)) opts.fallback = true

  EventEmitter.call(this)

  this._jobId = 0
  this._zeroconf = opts.zeroconf

  this.started = Date.now()
  this.jobs = []
  this.name = opts.name
  this.port = opts.port
  this.uri = opts.uri
  this.state = C.STOPPED
  this.server = opts.server
  this.fallback = opts.fallback

  bind(this)
}

util.inherits(Printer, EventEmitter)

Printer.prototype.start = function () {
  this.state = C.PRINTER_IDLE
  debug('printer "%s" changed state to idle', this.name)
}

Printer.prototype.stop = function () {
  this.state = C.PRINTER_STOPPED
  debug('printer "%s" changed state to stopped', this.name)
}

Printer.prototype.add = function (job) {
  this.jobs.push(job)
  this.emit('job', job)
}

Printer.prototype.attributes = function (filter) {
  if (filter && ~filter.indexOf('all')) filter = null
  if (filter) filter = utils.expandAttrGroups(filter)

  var now = new Date()
  var attrs = [
    { tag: C.URI, name: 'printer-uri-supported', value: this.uri },
    { tag: C.KEYWORD, name: 'uri-security-supported', value: 'none' }, // none, ssl3, tls
    { tag: C.KEYWORD, name: 'uri-authentication-supported', value: 'none' }, // none, requesting-user-name, basic, digest, certificate
    { tag: C.NAME_WITH_LANG, name: 'printer-name', value: { lang: 'en-us', value: this.name } },
    { tag: C.ENUM, name: 'printer-state', value: this.state },
    { tag: C.KEYWORD, name: 'printer-state-reasons', value: 'none' },
    { tag: C.KEYWORD, name: 'ipp-versions-supported', value: '1.1' }, // 1.0, 1.1
    { tag: C.ENUM, name: 'operations-supported', value: [C.PRINT_JOB, C.VALIDATE_JOB, C.GET_JOBS, C.GET_PRINTER_ATTRIBUTES, C.CANCEL_JOB, C.GET_JOB_ATTRIBUTES] },
    { tag: C.CHARSET, name: 'charset-configured', value: 'utf-8' },
    { tag: C.CHARSET, name: 'charset-supported', value: 'utf-8' },
    { tag: C.NATURAL_LANG, name: 'natural-language-configured', value: 'en-us' },
    { tag: C.NATURAL_LANG, name: 'generated-natural-language-supported', value: 'en-us' },
    { tag: C.MIME_MEDIA_TYPE, name: 'document-format-default', value: 'application/postscript' },
    { tag: C.MIME_MEDIA_TYPE, name: 'document-format-supported', value: ['text/html', 'text/plain', 'application/vnd.hp-PCL', 'application/octet-stream', 'application/pdf', 'application/postscript'] },
    { tag: C.BOOLEAN, name: 'printer-is-accepting-jobs', value: true },
    { tag: C.INTEGER, name: 'queued-job-count', value: this.jobs.length },
    { tag: C.KEYWORD, name: 'pdl-override-supported', value: 'not-attempted' }, // attempted, not-attempted
    { tag: C.INTEGER, name: 'printer-up-time', value: utils.time(this, now) },
    { tag: C.DATE_TIME, name: 'printer-current-time', value: now },
    { tag: C.KEYWORD, name: 'compression-supported', value: ['deflate', 'gzip'] } // none, deflate, gzip, compress
  ]

  if (!filter) return attrs

  return attrs.filter(function (attr) {
    return ~filter.indexOf(attr.name)
  })
}

Printer.prototype.getJob = function (id) {
  for (var i = 0, l = this.jobs.length; i < l; i++) {
    if (this.jobs[i].id === id) return this.jobs[i]
  }
}
