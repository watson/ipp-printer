'use strict'

var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')

var supportedJobAttributes = [
  'job-id',
  'job-state',
  'job-printer-uri',
  'job-uri',
  'job-name',
  'job-originating-user-name',
  'job-state-reasons',
  'time-at-creation',
  'time-at-processing',
  'time-at-completed',
  'job-printer-up-time',
  'attributes-charset',
  'attributes-natural-language'
]

exports.operationAttributesTag = operationAttributesTag
exports.unsupportedAttributesTagPrinter = unsupportedAttributesTagPrinter
exports.unsupportedAttributesTagJob = unsupportedAttributesTagJob
exports.printerAttributesTag = printerAttributesTag
exports.jobAttributesTag = jobAttributesTag

function operationAttributesTag (status) {
  return {
    tag: C.OPERATION_ATTRIBUTES_TAG,
    attributes: [
      { tag: C.CHARSET, name: 'attributes-charset', value: 'utf-8' },
      { tag: C.NATURAL_LANG, name: 'attributes-natural-language', value: 'en-us' },
      { tag: C.TEXT_WITH_LANG, name: 'status-message', value: { lang: 'en-us', value: status } }
    ]
  }
}

function unsupportedAttributesTagPrinter (printer, req) {
  return {
    tag: C.UNSUPPORTED_ATTRIBUTES_TAG,
    attributes: unsupportedAttributes(req, printer.attributes)
  }
}

function unsupportedAttributesTagJob (req) {
  return {
    tag: C.UNSUPPORTED_ATTRIBUTES_TAG,
    attributes: unsupportedAttributes(req, supportedJobAttributes)
  }
}

function printerAttributesTag (printer, req) {
  return {
    tag: C.PRINTER_ATTRIBUTES_TAG,
    attributes: filterAttributes(req, printer.attributes)
  }
}

function jobAttributesTag (printer, job) {
  return {
    tag: C.JOB_ATTRIBUTES_TAG,
    attributes: jobAttributes(printer, job)
  }
}

function jobAttributes (printer, job) {
  var attributes = [
    { tag: C.INTEGER, name: 'job-id', value: job.id },
    { tag: C.ENUM, name: 'job-state', value: job.state }
  ]

  if (job.processingAt) attributes.push({ tag: C.INTEGER, name: 'time-at-processing', value: utils.time(printer, job.processingAt) })
  else attributes.push({ tag: C.NO_VALUE, name: 'time-at-processing', value: 'no-value' })

  if (job.completedAt) attributes.push({ tag: C.INTEGER, name: 'time-at-processing', value: utils.time(printer, job.completedAt) })
  else attributes.push({ tag: C.NO_VALUE, name: 'time-at-completed', value: 'no-value' })

  attributes.push({ tag: C.INTEGER, name: 'job-printer-up-time', value: utils.time(printer) })

  return attributes.concat(job.attributes)
}

function unsupportedAttributes (req, attributes) {
  if (typeof attributes[0] === 'object') {
    attributes = attributes.map(function (attr) {
      return attr.name
    })
  }

  return requestedAttributes(req)
    .filter(function (name) {
      return !~attributes.indexOf(name)
    })
    .map(function (name) {
      return { tag: C.UNSUPPORTED, name: name, value: 'unsupported' }
    })
}

function filterAttributes (req, attributes) {
  var map = {}
  attributes.forEach(function (attr) {
    map[attr.name] = attr
  })

  return requestedAttributes(req)
    .filter(function (name) {
      return name in map
    })
    .map(function (name) {
      var obj = map[name]
      var result = { tag: obj.tag, name: name }
      if (obj.value) result.value = typeof obj.value === 'function' ? obj.value() : obj.value
      else result.values = obj.values
      return result
    })
}

function requestedAttributes (req) {
  var result
  req.groups.some(function (group) {
    if (group.tag === C.OPERATION_ATTRIBUTES_TAG) {
      group.attributes.some(function (attr) {
        if (attr.name === 'requested-attributes') {
          result = attr.values
          return true
        }
      })
      return true
    }
  })
  return result
}
