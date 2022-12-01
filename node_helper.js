var NodeHelper = require("node_helper");

const request = require("request");

module.exports = NodeHelper.create({
  init() {
    console.log("init module helper " + this.name);
  },

  start() {
    console.log("Starting module helper:" + this.name);
  },

  stop() {
    console.log("Stopping module helper: " + this.name);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "CONFIG") {
      // save payload config info
      this.config = payload;
    } else if (notification === "SHELLYEM") {
      var payload = {
        uri: this.config.localuri,
      };
      request(payload.uri, { json: true, timeout: 25000 }, (err, res, body) => {
        if (err) {
          return console.log(err);
        } else {
          payload = {
            emeters: body["emeters"],
          };
          //console.log("Body ", body['emeters']);
        }
        //console.log("Sending Shelly data to FE module", payload);
        this.sendSocketNotification("ShellyEMData", payload);
      });
    }
  },
});
