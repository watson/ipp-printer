#! /usr/bin/env node
var config = require('rc')('ipp-printer', {
  name: 'ipp-printer', dir: process.cwd(), port: 3000
})
var nonPrivate = require('non-private-ip')
var url = require('url')
var ip = nonPrivate() || nonPrivate.private()
var fs = require('fs')

var Printer = require('./')

var p = new Printer(config)

p.on('job', function (job) {
  var filename = 'ipp-printer_' + new Date().toISOString() + '.ps'
  job.pipe(fs.createWriteStream(filename)).on('finish', function () {
    console.log('printed:', filename)
  })

})
p.server.on('listening', function () {
  console.log('ipp-printer listening on:', url.format({protocol: 'http', hostname: ip, port: config.port}))
})
