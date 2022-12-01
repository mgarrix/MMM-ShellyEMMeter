Module.register("MMM-ShellyEMMeter", {
  everySeconds: 5,

  ShellyEMDataObj: {
    voltage: 0.0,
    power1: 0.0,
    total1: 0.0,
    total_returned1: 0.0,
    power2: 0.0,
    total2: 0.0,
    total_returned2: 0.0,
  },

  config: null,

  defaults: {
    message: "default message if none supplied in config.js",
  },

  init: function () {
    Log.log(this.name + " is in init!");
  },

  start: function () {
    Log.log("Starting module: " + this.name);
  },

  loaded: function (callback) {
    Log.log(this.name + " is loaded!");
    callback();
  },

  getStyles: function () {
    return ["MMM-ShellyEM.css"];
  },

  // return list of translation files
  getTranslations: function () {
    return {
      it: "translations/it.json",
      en: "translations/en.json",
    };
  },

  notificationReceived: function (notification, payload, sender) {
    // once everybody is loaded up
    if (notification === "ALL_MODULES_STARTED") {
      this.sendSocketNotification("CONFIG", this.config);
    }
    if (sender) {
      if (sender.name === "clock") {
        this.everySeconds--;
        if (this.everySeconds == 0) {
          // Reset countdown
          this.everySeconds = this.config.refreshInterval;
          this.sendSocketNotification("SHELLYEM");
        }
      }
    }
  },

  socketNotificationReceived: function (notification, payload) {
    //Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
    if (notification === "message_from_helper") {
      this.config.message = payload;
      this.updateDom(1000);
    } else if (notification === "ShellyEMData") {
      this.ShellyEMDataObj.voltage = payload.emeters[0].voltage;
      this.ShellyEMDataObj.power1 = payload.emeters[0].power;
      this.ShellyEMDataObj.power2 = payload.emeters[1].power;
      this.ShellyEMDataObj.total1 = payload.emeters[0].total;
      this.ShellyEMDataObj.total_returned1 = payload.emeters[0].total_returned;
      this.ShellyEMDataObj.total2 = payload.emeters[1].total;
      this.ShellyEMDataObj.total_returned2 = payload.emeters[1].total_returned;
      this.updateDom(150);
    }
  },

  getDom: function () {
    var wrapper = document.createElement("div");
    wrapper.className = "shellyEMGrid";

    var labelCons_or_Intake = this.translate("WITHDRAWAL");
    var classCons_or_Intake = "shellyEM-red";
    if (this.ShellyEMDataObj.power1 < 0) {
      labelCons_or_Intake = this.translate("INTAKE");
      classCons_or_Intake = "shellyEM-green";
    }
    ihtml =
      "<div>" +
      this.translate("VOLTAGE") +
      ": <span class='shellyEM-bright'>" +
      this.ShellyEMDataObj.voltage +
      "</span> V</div>";
    ihtml +=
      "<div>" +
      this.translate("CONSUMPTION") +
      ": <span class='shellyEM-bright shellyEM-big'>" +
      (this.ShellyEMDataObj.power2 + this.ShellyEMDataObj.power1).toFixed(2) +
      "</span> W</div>";
    ihtml +=
      "<div>" +
      labelCons_or_Intake +
      ": <span class='shellyEM-bright shellyEM-big " +
      classCons_or_Intake +
      "'>" +
      this.ShellyEMDataObj.power1.toFixed(2) +
      "</span> W</div>";
    ihtml +=
      "<div>" +
      this.translate("PRODUCTION") +
      ": <span class='shellyEM-bright shellyEM-big'>" +
      this.ShellyEMDataObj.power2.toFixed(2) +
      "</span> W</div>";
    wrapper.innerHTML = ihtml;

    return wrapper;
  },
});
