'use strict'

var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')

var attributeGroups = ['all', 'job-template', 'job-description', 'printer-description']

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

function unsupportedAttributesTagPrinter (printer, body) {
  return {
    tag: C.UNSUPPORTED_ATTRIBUTES_TAG,
    attributes: unsupportedAttributes(body, printer.attributes)
  }
}

function unsupportedAttributesTagJob (body) {
  return {
    tag: C.UNSUPPORTED_ATTRIBUTES_TAG,
    attributes: unsupportedAttributes(body, supportedJobAttributes)
  }
}

function printerAttributesTag (printer, body) {
  return {
    tag: C.PRINTER_ATTRIBUTES_TAG,
    attributes: filterAttributes(body, printer.attributes)
  }
}

function unsupportedAttributes (body, attributes) {
  if (typeof attributes[0] === 'object') {
    attributes = attributes.map(function (attr) {
      return attr.name
    })
  }

  var requested = utils.requestedAttributes(body)

  if (!requested) return []

  return requested
    .filter(function (name) {
      return !~attributeGroups.indexOf(name) && !~attributes.indexOf(name)
    })
    .map(function (name) {
      return { tag: C.UNSUPPORTED, name: name, value: 'unsupported' }
    })
}

function filterAttributes (body, attributes) {
  var map = {}
  attributes.forEach(function (attr) {
    map[attr.name] = attr
  })

  var requested = utils.requestedAttributes(body) || ['all']

  if (~requested.indexOf('all')) return attributes.map(compileAttribute)

  return requested
    .filter(function (name) {
      return name in map
    })
    .map(function (name) {
      return compileAttribute(map[name])
    })
}

function compileAttribute (attr) {
  var result = { tag: attr.tag, name: attr.name }
  if (attr.value) result.value = typeof attr.value === 'function' ? attr.value() : attr.value
  else result.values = attr.values
  return result
}
