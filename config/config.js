const _ = require("underscore");
const path = require("path");

const finalEnv = process.env.NODE_ENV || "development";

const allConf = require(path.resolve(__dirname + "/../config/env/all.js"))
const envConf = require(path.resolve(__dirname + "/../config/env/" + finalEnv.toLowerCase() + ".js")) || {}

const config = { ...allConf, ...envConf }

// A5-1 (Security Misconfiguration): removed logging of the full configuration,
// which previously dumped secrets (database URI, cookie secret, crypto key) to stdout.
module.exports = config;
