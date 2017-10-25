const config = require('config')
const Promise = require('promise')
const child_process = require('child_process')

const MongoClient = require('mongodb').MongoClient
const connect = Promise.denodeify(MongoClient.connect)

let dbConnection

let devicesWithTunnelPortNumber = 0

console.log("10047: " + doesConnectionWork(10047))
console.log("2222: " + doesConnectionWork(2222))

/*
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
      if (device.sshTunnelPort == 10047) {
        devicesWithTunnelPortNumber = devicesWithTunnelPortNumber + 1
        console.log("10047 Works: " + doesConnectionWork(device.sshTunnelPort))
      }
    })


    console.log("We have " + devices.length + " devices")
    console.log(devicesWithTunnelPortNumber + " have sshTunnelPortNumber")

    dbConnection.close()
  })
*/


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