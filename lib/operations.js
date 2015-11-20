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
  job.completedAt = Date.now()
  printer.emit('job', job)

  req.on('end', function () {
    res.send(groups.jobAttributesTag(printer, job))
  })
}

function validateJob (printer, req, res) {
  res.send()
}

function getPrinterAttributes (printer, req, res) {
  res.send([
    groups.unsupportedAttributesTagPrinter(printer, req),
    groups.printerAttributesTag(printer, req)
  ])
}

function getJobs (printer, req, res) {
  var attributes = utils.getAttributesForGroup(req, C.OPERATION_ATTRIBUTES_TAG)
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

  var _groups = jobs
    .sort(function (a, b) {
      if (a.completedAt && !b.completedAt) return -1
      if (!a.completedAt && b.completedAt) return 1
      if (!a.completedAt && !b.completedAt) return b.id - a.id
      return b.completedAt - b.completedAt
    })
    .map(groups.jobAttributesTag.bind(null, printer))

  res.send([groups.unsupportedAttributesTagJob(req)].concat(_groups))
}

function cancelJob (printer, req, res) {
  var job = utils.getJobFromRequest(printer, req)
  if (!job) return res.send(C.CLIENT_ERROR_NOT_POSSIBLE) // TODO: Not sure this is the correct status code
  switch (job.state) {
    case C.JOB_PENDING:
    case C.JOB_PENDING_HELD:
    case C.JOB_PROCESSING:
    case C.JOB_PROCESSING_STOPPED:
      job.state = C.JOB_CANCELED
      res.send(C.SUCCESSFUL_OK)
      break
    case C.JOB_CANCELED:
    case C.JOB_ABORTED:
    case C.JOB_COMPLETED:
      res.send(C.CLIENT_ERROR_NOT_POSSIBLE)
      break
    default:
      res.send(C.CLIENT_ERROR_NOT_POSSIBLE) // TODO: Not sure this is the correct status code
  }
}

function getJobAttributes (printer, req, res) {
  var job = utils.getJobFromRequest(printer, req)
  if (!job) return res.send(C.CLIENT_ERROR_NOT_POSSIBLE) // TODO: This doesn't seem to be the correct status code - OSX doesn't re-send the job
  res.send([groups.unsupportedAttributesTagJob(req)].concat(groups.jobAttributesTag(printer, job)))
}
