const os = require('os')
const Printer = require('../index')
const fs = require('fs')
const path = require('path')
let printer
const spoolPath = path.join(os.tmpdir(), 'TESTER')

printer = new Printer({ name: 'this thing', host: 'localhost', port: '22987'})
printer.on('job', async function (job) {
    console.log('Print job with ID ' + job.id + ' has been accepted')
    console.log('[job %d] Printing document: %s', job.id, job.name)
    console.log('Simulating job start...')
    let jobname = job.name.replace(/\s+/g, '')
    try {
        await fs.promises.access(spoolPath)
        console.log('Exists')
    } catch {
        await fs.promises.mkdir(spoolPath)
        console.log('Creating directory...')
    }
    let filename = spoolPath + jobname + '.ps'
    const file = fs.createWriteStream(filename)
    job.on('end', function () {
        console.log('Job was saved, theoretically.')
    })
    job.pipe(file)
})
