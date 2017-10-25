const config = require('config')
const Promise = require('promise')
const child_process = require('child_process')

const MongoClient = require('mongodb').MongoClient
const connect = Promise.denodeify(MongoClient.connect)

let dbConnection

let devicesWithCorrectUpdaterVersion = []
let devicesThatWork = []
let devicesThatDontWork = []

console.log("\n====================================================================")
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
    console.log("Testing " + devices.length + " devices...")

    devices.forEach((device) => {
      if (device.sshTunnelPort && (device.updaterVersion == config.expectedUpdaterVersion)) {
        devicesWithCorrectUpdaterVersion.push(device)

        if (doesConnectionWork(device.sshTunnelPort)) {
          process.stdout.write(".")
          devicesThatWork.push(device)
        } else {
          process.stdout.write("X")
          devicesThatDontWork.push(device)
        }
      }
    })
    process.stdout.write("\n\n")
    console.log("We have " + devices.length + " devices")
    console.log(devicesWithCorrectUpdaterVersion.length + " devices have updater version " + config.expectedUpdaterVersion)
    console.log(devicesThatWork.length + " devices work")
    console.log("")
    if (devicesThatDontWork.length > 0) {
      console.log(devicesThatDontWork.length + " devices don't work: ")
      devicesThatDontWork.forEach((device) => {
        console.log("  - " + device.deviceId + " (port " + device.sshTunnelPort + ", updater " + device.updaterVersion + ")")
      })
    } else {
      console.log("All devices work!")
    }

    dbConnection.close()
  })



function doesConnectionWork(port) {
  const command = "ssh"
  const args = [
    "-i",
    config.sshKey,
    "-o",
    "ConnectTimeout=" + config.timeoutSeconds,
    "-l",
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "StrictHostKeyChecking=no",
    "pi",
    "-p",
    "" + port,
    "localhost",
    "exit"
  ]
  const result = child_process.spawnSync(command, args)
  return result.status == 0
}