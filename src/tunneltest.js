const config = require('config')
const Promise = require('promise')
const child_process = require('child_process')

const MongoClient = require('mongodb').MongoClient
const connect = Promise.denodeify(MongoClient.connect)

let dbConnection

let devicesWithTunnelPortNumber = 0


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
        const sshTestCommand = "ssh -l pi -p " + device.sshTunnelPort + " -i " + config.sshKey + " localhost exit"
        console.log("Calling: " + sshTestCommand)
        const result = child_process.spawnSync(sshTestCommand)
        console.log(" => ", result)
      }
    })


    console.log("We have " + devices.length + " devices")
    console.log(devicesWithTunnelPortNumber + " have sshTunnelPortNumber")

    dbConnection.close()
  })