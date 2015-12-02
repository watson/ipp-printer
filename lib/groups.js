'use strict'

var C = require('ipp-encoder').CONSTANTS
var utils = require('./utils')

exports.operationAttributesTag = operationAttributesTag
exports.unsupportedAttributesTag = unsupportedAttributesTag
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

function unsupportedAttributesTag (body, attributes) {
  return {
    tag: C.UNSUPPORTED_ATTRIBUTES_TAG,
    attributes: unsupportedAttributes(body, attributes)
  }
}

function printerAttributesTag (printer, requested) {
  return {
    tag: C.PRINTER_ATTRIBUTES_TAG,
    attributes: printer.attributes(requested)
  }
}

function jobAttributesTag (job, requested) {
  return {
    tag: C.JOB_ATTRIBUTES_TAG,
    attributes: job.attributes(requested)
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

  requested = utils.removeStandardAttributes(requested)

  return requested
    .filter(function (name) {
      return !~attributes.indexOf(name)
    })
    .map(function (name) {
      return { tag: C.UNSUPPORTED, name: name, value: 'unsupported' }
    })
}
