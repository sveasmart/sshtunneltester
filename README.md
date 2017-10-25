# SSH Tunnel Tester

This is used to test the SSH tunnel connections to our devices.

## How do I install it?

`npm install`

## How do I configure it?

* Set config parameter `mongoUrl` in config/local.yml.
* Check the other params in config/default.yml and decide if you need to override any

## How do I run it?

`npm start`

## What does it do?

* Connects to the mongo DB and finds all devices with the correct updater version.
* Tries to open an SSH tunnel connection to each one.
* Reports how many devices that work, and which ones that don't work.



