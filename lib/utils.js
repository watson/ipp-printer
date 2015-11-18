'use strict'

exports.time = time

function time (printer, seconds) {
  if (seconds === undefined) seconds = Date.now()
  return Math.floor((seconds - printer.started) / 1000)
}
