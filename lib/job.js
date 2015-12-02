'use strict'

var util = require('util')
var zlib = require('zlib')
var PassThrough = require('readable-stream').PassThrough
var pump = require('pump')
var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')

module.exports = Job

function Job (printer, req) {
  PassThrough.call(this)

  var attributes = utils.getAttributesForGroup(req._body, C.OPERATION_ATTRIBUTES_TAG)
  this.compression = utils.getFirstValueForName(attributes, 'compression')

  this._printer = printer
  this._req = req

  this.id = ++printer._jobId
  this.state = C.JOB_PENDING
  this.uri = printer.uri + this.id
  this.name = utils.getFirstValueForName(attributes, 'job-name')
  this.userName = utils.getFirstValueForName(attributes, 'requesting-user-name')
  this.createdAt = new Date()

  printer.add(this)
}

util.inherits(Job, PassThrough)

Job.prototype.attributes = function (filter) {
  if (filter && ~filter.indexOf('all')) filter = null
  if (filter) filter = utils.expandAttrGroups(filter)

  var attrs = [
    { tag: C.INTEGER, name: 'job-id', value: this.id },
    { tag: C.URI, name: 'job-uri', value: this.uri },
    { tag: C.ENUM, name: 'job-state', value: this.state },
    { tag: C.URI, name: 'job-printer-uri', value: this._printer.uri },
    { tag: C.INTEGER, name: 'job-printer-up-time', value: utils.time(this._printer) },
    { tag: C.NAME_WITHOUT_LANG, name: 'job-name', value: this.name },
    { tag: C.NAME_WITHOUT_LANG, name: 'job-originating-user-name', value: this.userName },
    { tag: C.KEYWORD, name: 'job-state-reasons', value: 'none' },
    { tag: C.INTEGER, name: 'time-at-creation', value: utils.time(this._printer, this.createdAt) },
    { tag: C.DATE_TIME, name: 'date-time-at-creation', value: this.createdAt },
    { tag: C.CHARSET, name: 'attributes-charset', value: 'utf-8' },
    { tag: C.NATURAL_LANG, name: 'attributes-natural-language', value: 'en-us' }
  ]

  if (!filter || ~filter.indexOf('time-at-processing')) {
    if (this.processingAt) {
      attrs.push({ tag: C.INTEGER, name: 'time-at-processing', value: utils.time(this._printer, this.processingAt) })
      attrs.push({ tag: C.DATE_TIME, name: 'date-time-at-processing', value: this.processingAt })
    } else {
      attrs.push({ tag: C.NO_VALUE, name: 'time-at-processing', value: 'no-value' })
      attrs.push({ tag: C.NO_VALUE, name: 'date-time-at-processing', value: 'no-value' })
    }
  }
  if (!filter || ~filter.indexOf('time-at-completed')) {
    if (this.completedAt) {
      attrs.push({ tag: C.INTEGER, name: 'time-at-completed', value: utils.time(this._printer, this.completedAt) })
      attrs.push({ tag: C.DATE_TIME, name: 'date-time-at-completed', value: this.completedAt })
    } else {
      attrs.push({ tag: C.NO_VALUE, name: 'time-at-completed', value: 'no-value' })
      attrs.push({ tag: C.NO_VALUE, name: 'date-time-at-completed', value: 'no-value' })
    }
  }

  if (!filter) return attrs

  return attrs.filter(function (attr) {
    return ~filter.indexOf(attr.name)
  })
}

Job.prototype.process = function () {
  var self = this

  this.processingAt = new Date()
  this.state = C.JOB_PROCESSING

  process.nextTick(function () {
    var decompressor

    switch (self.compression) {
      case 'deflate':
        decompressor = zlib.createInflate()
        break
      case 'gzip':
        decompressor = zlib.createGunzip()
        break
      case undefined:
        // all is good :)
        break
      default:
        self.abort(C.CLIENT_ERROR_COMPRESSION_NOT_SUPPORTED)
        return
    }

    if (self._req._body.data.length > 0) (decompressor || self).write(self._req._body.data)
    if (decompressor) pump(self._req, decompressor, self, done)
    else pump(self._req, self, done)

    function done (err) {
      if (err) return self.emit('error', err)
      self.completedAt = new Date()
      self.state = C.JOB_COMPLETED
    }
  })
}

Job.prototype.cancel = function () {
  this.state = C.JOB_CANCELED
  this.emit('cancel')
}

Job.prototype.abort = function (statusCode) {
  this.state = C.JOB_ABORTED
  this.emit('abort', statusCode)
}
