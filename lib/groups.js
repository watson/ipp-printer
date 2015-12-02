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

function unsupportedAttributesTag (attributes, requested) {
  return {
    tag: C.UNSUPPORTED_ATTRIBUTES_TAG,
    attributes: unsupportedAttributes(attributes, requested)
  }
}

function printerAttributesTag (attributes) {
  return {
    tag: C.PRINTER_ATTRIBUTES_TAG,
    attributes: attributes
  }
}

function jobAttributesTag (attributes) {
  return {
    tag: C.JOB_ATTRIBUTES_TAG,
    attributes: attributes
  }
}

function unsupportedAttributes (attributes, requested) {
  var supported = attributes.map(function (attr) {
    return attr.name
  })

  if (!requested) return []

  requested = utils.removeStandardAttributes(requested)

  return requested
    .filter(function (name) {
      return !~supported.indexOf(name)
    })
    .map(function (name) {
      return { tag: C.UNSUPPORTED, name: name, value: 'unsupported' }
    })
}
