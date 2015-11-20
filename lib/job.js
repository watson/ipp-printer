'use strict'

var util = require('util')
var PassThrough = require('stream').PassThrough
var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')

module.exports = Job

function Job (printer, req) {
  PassThrough.call(this)

  var self = this
  var attributes = utils.getAttributesForGroup(req._body, C.OPERATION_ATTRIBUTES_TAG)
  var jobName = utils.getFirstValueForName(attributes, 'job-name')
  var userName = utils.getFirstValueForName(attributes, 'requesting-user-name')

  this._printer = printer

  this.id = ++printer._jobId
  this.state = C.JOB_PENDING
  this.attributes = [
    { tag: C.URI, name: 'job-printer-uri', value: printer.uri() },
    { tag: C.URI, name: 'job-uri', value: printer.uri() + printer._jobId },
    { tag: C.NAME_WITHOUT_LANG, name: 'job-name', value: jobName },
    { tag: C.NAME_WITHOUT_LANG, name: 'job-originating-user-name', value: userName },
    { tag: C.KEYWORD, name: 'job-state-reasons', value: 'none' },
    { tag: C.INTEGER, name: 'time-at-creation', value: utils.time(printer) },
    { tag: C.CHARSET, name: 'attributes-charset', value: 'utf-8' },
    { tag: C.NATURAL_LANG, name: 'attributes-natural-language', value: 'en-us' }
  ]

  this.on('end', function () {
    self.completedAt = Date.now()
    self.state = C.JOB_COMPLETED
  })

  printer.jobs.push(this)

  if (req._body.data.length > 0) this.write(req._body.data)
  req.pipe(this)
}

util.inherits(Job, PassThrough)

Job.prototype.getAttributes = function (attrs) {
  var arr = []

  if (!attrs || ~attrs.indexOf('job-id')) {
    arr.push({ tag: C.INTEGER, name: 'job-id', value: this.id })
  }
  if (!attrs || ~attrs.indexOf('job-state')) {
    arr.push({ tag: C.ENUM, name: 'job-state', value: this.state })
  }
  if (!attrs || ~attrs.indexOf('time-at-processing')) {
    if (this.processingAt) arr.push({ tag: C.INTEGER, name: 'time-at-processing', value: utils.time(this._printer, this.processingAt) })
    else arr.push({ tag: C.NO_VALUE, name: 'time-at-processing', value: 'no-value' })
  }
  if (!attrs || ~attrs.indexOf('time-at-completed')) {
    if (this.completedAt) arr.push({ tag: C.INTEGER, name: 'time-at-completed', value: utils.time(this._printer, this.completedAt) })
    else arr.push({ tag: C.NO_VALUE, name: 'time-at-completed', value: 'no-value' })
  }
  if (!attrs || ~attrs.indexOf('job-printer-up-time')) {
    arr.push({ tag: C.INTEGER, name: 'job-printer-up-time', value: utils.time(this._printer) })
  }

  if (attrs) {
    return arr.concat(this.attributes.filter(function (attr) {
      return ~attrs.indexOf(attr.name)
    }))
  } else {
    return arr.concat(this.attributes)
  }
}
