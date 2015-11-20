'use strict'

var C = require('ipp-encoder').CONSTANTS

exports.time = time
exports.getJobFromRequest = getJobFromRequest
exports.getAttributesForGroup = getAttributesForGroup
exports.getFirstValueForName = getFirstValueForName

function time (printer, seconds) {
  if (seconds === undefined) seconds = Date.now()
  return Math.floor((seconds - printer.started) / 1000)
}

function getJobFromRequest (printer, req) {
  var attributes = getAttributesForGroup(req, C.OPERATION_ATTRIBUTES_TAG)
  var id = getFirstValueForName(attributes, 'job-id')
  return printer.getJob(id)
}

function getAttributesForGroup (req, tag) {
  var result = findOneByKey(req.groups, 'tag', tag)
  if (result) return result.attributes
}

function getFirstValueForName (attributes, name) {
  var result = findOneByKey(attributes, 'name', name)
  if (result) return result.values ? result.values[0] : result.value
}

function findOneByKey (arr, key, value) {
  for (var i = 0, l = arr.length; i < l; i++) {
    if (arr[i][key] === value) return arr[i]
  }
}
