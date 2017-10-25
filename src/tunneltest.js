const config = require('config')
const Promise = require('promise')
const child_process = require('child_process')

const MongoClient = require('mongodb').MongoClient
const connect = Promise.denodeify(MongoClient.connect)

let dbConnection

let devicesWithTunnelPortNumber = []
let devicesThatWork = []
let devicesThatDontWork = []


console.log("Connecting to DB...")
connect(config.mongoUrl)

  .then((db) => {
    console.log("Getting devices...");
    dbConnection = db

    const Devices = db.collection('devices')
    return Devices.find({}, {deviceId: 1, sshTunnelPort: 1, updaterVersion: 1})

  }).then((cursor) => {

    return cursor.toArray()

  }).then((devices) => {

    devices.forEach((device) => {
      if (device.sshTunnelPort) {
        devicesWithTunnelPortNumber.push(device)
        console.log("  testing " + device.deviceId + " (port " + device.sshTunnelPort + ")...")
        if (doesConnectionWork(device.sshTunnelPort)) {
          console.log("  ...works!")
          devicesThatWork.push(device)
        } else {
          console.log("  ...doesn't work!")
          devicesThatDontWork.push(device)
        }
      }
    })


    console.log("We have " + devices.length + " devices")
    console.log(devicesWithTunnelPortNumber.length + " have sshTunnelPortNumber")
    console.log(devicesThatWork.length + " work")
    console.log("")
    console.log("The following devices don't work: ", devicesThatDontWork)

    dbConnection.close()
  })



function doesConnectionWork(port) {
  const command = "ssh"
  const args = [
    "-i",
    config.sshKey,
    "-l",
    "pi",
    "-p",
    "" + port,
    "localhost",
    "exit"
  ]
  const result = child_process.spawnSync(command, args)
  return result.status == 0
}