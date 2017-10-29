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
  return Devices.find({}, {deviceId: 1, sshTunnelPort: 1, updaterVersion: 1, nextExpectedSignOfLife: 1})

}).then((cursor) => {

  return cursor.toArray()

}).then((devices) => {
  console.log("We have " + devices.length + " devices.")

  devicesWithCorrectUpdaterVersion = devices.filter((device) => {
    return device.updaterVersion == config.expectedUpdaterVersion
  })

  console.log(devicesWithCorrectUpdaterVersion.length + " of these have updater version " + config.expectedUpdaterVersion)
  console.log("Connecting to each one...")

  const checkConnectionPromises = []

  devicesWithCorrectUpdaterVersion.forEach((device) => {
    checkConnectionPromises.push(createCheckConnectionPromise(device))
  })

  return Promise.all(checkConnectionPromises)

}).then(() => {
  process.stdout.write("\n\n")
  console.log(devicesThatWork.length + " have a working SSH tunnel.")
  console.log("")
  if (devicesThatDontWork.length > 0) {
    console.log(devicesThatDontWork.length + " were not reachable:")
    devicesThatDontWork.forEach((device) => {
      let updaterStatus
      if (isUpdaterOnline(device)) {
        updaterStatus = "online"
      } else {
        updaterStatus = "OFFLINE"
      }
      console.log("  - " + device.deviceId + " (port " + device.sshTunnelPort + ", updater " + device.updaterVersion + " " + updaterStatus + ")")
    })
  } else {
    console.log("That's all of them! Yay!")
  }

  dbConnection.close()
})
.catch((err) => {
  console.log("Error", err)
})

function createCheckConnectionPromise(device) {
  return new Promise((resolve, reject) => {
    checkIfConnectionWorks(device.sshTunnelPort).then((works) => {
      if (works) {
        process.stdout.write(".")
        devicesThatWork.push(device)
      } else {
        process.stdout.write("X")
        devicesThatDontWork.push(device)
      }
      resolve()
    }).catch((err) => {
      console.log("Error from checkIfConnectionWorks: " + err)
      reject()
    })

  })
}


/**
 * Returns a promise that results in true/false depending on if the ssh connection worked.
 */
function checkIfConnectionWorks(port) {
  const command = "ssh"
  const args = [
    "-i",
    config.sshKey,
    "-o",
    "ConnectTimeout=" + config.timeoutSeconds,
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "StrictHostKeyChecking=no",
    "-l",
    "pi",
    "-p",
    "" + port,
    "localhost",
    "exit"
  ]
  const childProcess = child_process.spawn(command, args)
  return new Promise((resolve, reject) => {
    childProcess.on('exit', (code) => {
      if (code == 0) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
    childProcess.on('close', (code) => {
      if (code == 0) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
    childProcess.on('disconnect', (code) => {
      resolve(false)
    })
    childProcess.on('error', (code) => {
      resolve(false)
    })
  })
}

function isUpdaterOnline(device) {
  const now = new Date()
  const nextExpectedSignOfLife = device.nextExpectedSignOfLife
  if (!nextExpectedSignOfLife) {
    return false
  }
  //If nextExpectedSignOfLife is in the past, then updater is offline.
  //Adding a 10 second margin.
  const margin = 10000
  if (nextExpectedSignOfLife.getTime() < (now.getTime() - margin)) {
    return false
  } else {
    return true
  }
}