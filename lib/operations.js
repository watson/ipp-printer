'use strict'

var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')
var groups = require('./groups')
var Job = require('./job')

exports.printJob = printJob
exports.validateJob = validateJob
exports.getPrinterAttributes = getPrinterAttributes
exports.getJobs = getJobs
exports.cancelJob = cancelJob
exports.getJobAttributes = getJobAttributes

function printJob (printer, req, res) {
  var job = new Job(printer, req)
  job.processingAt = Date.now()
  printer.emit('job', job)

  req.on('end', function () {
    res.send({
      tag: C.JOB_ATTRIBUTES_TAG,
      attributes: job.getAttributes(['job-uri', 'job-id', 'job-state'])
    })
  })
}

function validateJob (printer, req, res) {
  res.send()
}

function getPrinterAttributes (printer, req, res) {
  var group1 = groups.unsupportedAttributesTag(req._body, printer.attributes)
  var group2 = groups.printerAttributesTag(req._body, printer.attributes)
  res.send(group1.attributes.length > 0 ? [group1, group2] : [group2])
}

function getJobs (printer, req, res) {
  var attributes = utils.getAttributesForGroup(req._body, C.OPERATION_ATTRIBUTES_TAG)
  var limit = utils.getFirstValueForName(attributes, 'limit') || Infinity
  var which = utils.getFirstValueForName(attributes, 'which-jobs')
  var states

  switch (which) {
    case 'completed':
      states = [C.JOB_COMPLETED, C.JOB_CANCELED, C.JOB_ABORTED]
      break
    case 'not-completed':
      states = [C.JOB_PENDING, C.JOB_PROCESSING, C.JOB_PROCESSING_STOPPED, C.JOB_PENDING_HELD]
      break
    case undefined:
      // all is good :)
      break
    default:
      res.send(
        C.CLIENT_ERROR_ATTRIBUTES_OR_VALUES_NOT_SUPPORTED,
        { tag: C.UNSUPPORTED_ATTRIBUTES_TAG, attributes: [
          { tag: C.UNSUPPORTED, name: 'which-jobs', value: which }
        ] }
      )
      return
  }

  var jobs = states
    ? printer.jobs.filter(function (job) { return ~states.indexOf(job.state) })
    : printer.jobs

  var requested = utils.requestedAttributes(req._body) || ['job-uri', 'job-id']
  var group = groups.unsupportedAttributesTag(req._body, requested)
  var _groups = group.attributes.length > 0 ? [group] : []

  _groups = _groups.concat(jobs
    .sort(function (a, b) {
      if (a.completedAt && !b.completedAt) return -1
      if (!a.completedAt && b.completedAt) return 1
      if (!a.completedAt && !b.completedAt) return b.id - a.id
      return b.completedAt - b.completedAt
    })
    .slice(0, limit)
    .map(function (job) {
      return groups.jobAttributesTag(job, requested)
    }))

  res.send(_groups)
}

function cancelJob (printer, req, res) {
  var job = utils.getJobFromRequest(printer, req._body)
  if (!job) return res.send(C.CLIENT_ERROR_NOT_FOUND)

  switch (job.state) {
    case C.JOB_PENDING:
    case C.JOB_PENDING_HELD:
    case C.JOB_PROCESSING:
    case C.JOB_PROCESSING_STOPPED:
      job.cancel()
      res.send(C.SUCCESSFUL_OK)
      break
    default:
      res.send(C.CLIENT_ERROR_NOT_POSSIBLE)
  }
}

function getJobAttributes (printer, req, res) {
  var job = utils.getJobFromRequest(printer, req._body)
  if (!job) return res.send(C.CLIENT_ERROR_NOT_FOUND)

  var requested = utils.requestedAttributes(req._body) || ['all']
  var group1 = groups.unsupportedAttributesTag(req._body, requested)
  var group2 = groups.jobAttributesTag(job, requested)
  res.send(group1.attributes.length > 0 ? [group1, group2] : [group2])
}
