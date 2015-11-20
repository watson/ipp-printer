'use strict'

var util = require('util')
var PassThrough = require('stream').PassThrough

module.exports = Request

function Request (opts) {
  PassThrough.call(this)

  this.version = opts.version
  this.operationId = opts.operationId
  this.requestId = opts.requestId
  this.groups = opts.groups
}

util.inherits(Request, PassThrough)
