'use strict'

var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')
var groups = require('./groups')

exports.printJob = printJob
exports.validateJob = validateJob
exports.getPrinterAttributes = getPrinterAttributes
exports.getJobs = getJobs
exports.cancelJob = cancelJob
exports.getJobAttributes = getJobAttributes

function printJob (printer, req, res) {
  var job = createJob(printer, req.body)
  job.state = C.JOB_COMPLETED
  job.processingAt = Date.now()
  job.completedAt = Date.now()
  res.send(groups.jobAttributesTag(printer, job))
  printer.emit('job', job)
}

function validateJob (printer, req, res) {
  res.send()
}

function getPrinterAttributes (printer, req, res) {
  res.send([
    groups.unsupportedAttributesTagPrinter(printer, req.body),
    groups.printerAttributesTag(printer, req.body)
  ])
}

function getJobs (printer, req, res) {
  var attributes = getAttributesForGroup(req.body, C.OPERATION_ATTRIBUTES_TAG)
  var which = getFirstValueForName(attributes, 'which-jobs')
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

  res.send([groups.unsupportedAttributesTagJob(req.body)].concat(_groups))
}

function cancelJob (printer, req, res) {
  var job = getJobFromBody(printer, req.body)
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
  var job = getJobFromBody(printer, req.body)
  if (!job) return res.send(C.CLIENT_ERROR_NOT_POSSIBLE) // TODO: This doesn't seem to be the correct status code - OSX doesn't re-send the job
  res.send([groups.unsupportedAttributesTagJob(req.body)].concat(groups.jobAttributesTag(printer, job)))
}

/**
 * -----------------------------
 * HELPER FUNCTIONS
 * -----------------------------
 */

function createJob (printer, body) {
  var attributes = getAttributesForGroup(body, C.OPERATION_ATTRIBUTES_TAG)
  var jobName = getFirstValueForName(attributes, 'job-name')
  var userName = getFirstValueForName(attributes, 'requesting-user-name')
  var job = {
    id: ++printer._jobId,
    state: C.JOB_PENDING,
    data: body.data,
    attributes: [
      { tag: C.URI, name: 'job-printer-uri', value: printer.uri() },
      { tag: C.URI, name: 'job-uri', value: printer.uri() + printer._jobId },
      { tag: C.NAME_WITHOUT_LANG, name: 'job-name', value: jobName },
      { tag: C.NAME_WITHOUT_LANG, name: 'job-originating-user-name', value: userName },
      { tag: C.KEYWORD, name: 'job-state-reasons', value: 'none' },
      { tag: C.INTEGER, name: 'time-at-creation', value: utils.time(printer) },
      { tag: C.CHARSET, name: 'attributes-charset', value: 'utf-8' },
      { tag: C.NATURAL_LANG, name: 'attributes-natural-language', value: 'en-us' }
    ]
  }
  printer.jobs.push(job)
  return job
}

function getJobFromBody (printer, body) {
  var attributes = getAttributesForGroup(body, C.OPERATION_ATTRIBUTES_TAG)
  var id = getFirstValueForName(attributes, 'job-id')
  return printer.getJob(id)
}

function getAttributesForGroup (body, tag) {
  var result = findOneByKey(body.groups, 'tag', tag)
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
