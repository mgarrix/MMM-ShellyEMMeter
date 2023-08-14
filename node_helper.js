var NodeHelper = require("node_helper");

const axios = require('axios');

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
      const self = this;
      axios.get(payload.uri)
      .then(function (response) {
        const data = response.data;
        self.sendSocketNotification('ShellyEMData', data);
      })
      .catch(function (error) {
        console.error('Error fetching data:', error);
      });
     
    }
  },
});
