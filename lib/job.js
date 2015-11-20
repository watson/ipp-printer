'use strict'

var util = require('util')
var PassThrough = require('stream').PassThrough
var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')

module.exports = Job

function Job (printer, req) {
  PassThrough.call(this)

  var self = this
  var attributes = utils.getAttributesForGroup(req, C.OPERATION_ATTRIBUTES_TAG)
  var jobName = utils.getFirstValueForName(attributes, 'job-name')
  var userName = utils.getFirstValueForName(attributes, 'requesting-user-name')

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
    self.state = C.JOB_COMPLETED
  })

  req.pipe(this)
}

util.inherits(Job, PassThrough)
