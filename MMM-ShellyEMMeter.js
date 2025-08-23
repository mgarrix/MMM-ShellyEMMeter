Module.register("MMM-ShellyEMMeter", {
  everySeconds: 5,

  ShellyEMDataObj: {
    voltage: 0.0,
    power1: 0.0,
    total1: 0.0,
    total_returned1: 0.0,
    power2: 0.0,
    total2: 0.0,
    total_returned2: 0.0
  },

  config: null,
  domCreated: false,
  domElements: null,

  defaults: {
    message: "Please setup config.js",
  },

  init: function () {
    Log.log(this.name + " is in init!");
  },

  start: function () {
    Log.log("Starting module: " + this.name);
    this.voltageBounds = this.computeVoltageBounds(this.config.voltageScale);
  },

  loaded: function (callback) {
    Log.log(this.name + " is loaded!");
    callback();
  },

  getStyles: function () {
    return ["MMM-ShellyEM.css", "MMM-ShellyEM-voltage.css"];
  },

  getTranslations: function () {
    return {
      it: "translations/it.json",
      en: "translations/en.json",
      default: "translations/en.json"
    };
  },

  computeVoltageBounds(cfg = {}) {
    const nominal = Number(cfg.nominal) || 230;
    const tol = Number(cfg.tolerancePercent);

    if (Number.isFinite(cfg.min) && Number.isFinite(cfg.max)) {
      return { min: cfg.min, max: cfg.max };
    }

    const t = Number.isFinite(tol) ? tol : 10; // default �10%
    return {
      min: +(nominal * (1 - t / 100)).toFixed(1),
      max: +(nominal * (1 + t / 100)).toFixed(1),
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
    Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
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
      
      if (this.domCreated) {
        this.updateValues();
      } else {
        // First load, reload all DOM
        this.updateDom(150);
      }
    }
  },

  updateValues: function () {
    if (!this.domElements) {
      this.cacheElements();
      if (!this.domElements) {
        Log.log(this.name + " - DOM elements not found, reload");
        this.domCreated = false;
        this.updateDom(150);
        return;
      }
    }
    
    // Update voltage bar
    if (this.domElements.voltageIndicator && this.domElements.voltageValue) {
      var voltage = this.ShellyEMDataObj.voltage;
      
      var minVoltage = this.voltageBounds?.min ?? 195;
      var maxVoltage = this.voltageBounds?.max ?? 255;

      var percentage = Math.max(0, Math.min(100, ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100));
      
      this.domElements.voltageIndicator.style.left = percentage + '%';
      this.domElements.voltageValue.style.left = percentage + '%'; // Sincronize position
      this.domElements.voltageValue.textContent = voltage + ' v';
    }

    // update consumption (power1 + power2)
    if (this.domElements.consumption) {
      this.domElements.consumption.textContent = (this.ShellyEMDataObj.power2 + this.ShellyEMDataObj.power1).toFixed(2);
    }

    // update withdrawal/intake
    if (this.domElements.withdrawal && this.domElements.withdrawalContainer) {
      this.domElements.withdrawal.textContent = this.ShellyEMDataObj.power1.toFixed(2);
      
      // Cambia label e classe CSS in base al valore
      var labelElement = this.domElements.withdrawalContainer.querySelector(".shellyem-label");
      if (this.ShellyEMDataObj.power1 < 0) {
        if (labelElement) labelElement.textContent = this.translate("INTAKE");
        this.domElements.withdrawal.className = 'shellyEM-bright shellyEM-big shellyEM-green';
      } else {
        if (labelElement) labelElement.textContent = this.translate("WITHDRAWAL");
        this.domElements.withdrawal.className = 'shellyEM-bright shellyEM-big shellyEM-red';
      }
    }

    // Update production
    if (this.domElements.production) {
      this.domElements.production.textContent = this.ShellyEMDataObj.power2.toFixed(2);
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

    // Voltage bar
    var ihtml =
      "<div class='voltage-bar-container'>" +
      "<div class='voltage-bar'>" +
      "<div class='voltage-gradient'></div>" +
      "<div class='voltage-indicator' id='shellyem-voltage-indicator'></div>" +
      "<div class='voltage-value' id='shellyem-voltage-value'>" + this.ShellyEMDataObj.voltage + " v</div>" +
      "</div>" +
      "</div>";
    ihtml +=
      "<div>" +
      this.translate("CONSUMPTION") +
      ": <span class='shellyEM-bright shellyEM-big' id='shellyem-consumption'>" +
      (this.ShellyEMDataObj.power2 + this.ShellyEMDataObj.power1).toFixed(2) +
      "</span> W</div>";
    ihtml +=
      "<div id='shellyem-withdrawal-container'>" +
      "<span class='shellyem-label'>" + labelCons_or_Intake + "</span>" +
      ": <span class='shellyEM-bright shellyEM-big " +
      classCons_or_Intake +
      "' id='shellyem-withdrawal'>" +
      this.ShellyEMDataObj.power1.toFixed(2) +
      "</span> W</div>";
    ihtml +=
      "<div>" +
      this.translate("PRODUCTION") +
      ": <span class='shellyEM-bright shellyEM-big' id='shellyem-production'>" +
      this.ShellyEMDataObj.power2.toFixed(2) +
      "</span> W</div>";
    
    wrapper.innerHTML = ihtml;
    this.domCreated = true;
    
    var self = this;
    setTimeout(function() {
      self.cacheElements();
    }, 100);
    
    return wrapper;
  },

  cacheElements: function() {
    var wrapper = document.querySelector("." + this.identifier + " .shellyEMGrid");
    if (!wrapper) {
      wrapper = document.querySelector("#" + this.identifier + " .shellyEMGrid");
    }
    if (!wrapper) {
      wrapper = document.querySelector(".shellyEMGrid");
    }
    
    if (wrapper) {
      this.domElements = {
        voltageIndicator: wrapper.querySelector("#shellyem-voltage-indicator"),
        voltageValue: wrapper.querySelector("#shellyem-voltage-value"),
        consumption: wrapper.querySelector("#shellyem-consumption"),
        withdrawal: wrapper.querySelector("#shellyem-withdrawal"),
        withdrawalContainer: wrapper.querySelector("#shellyem-withdrawal-container"),
        production: wrapper.querySelector("#shellyem-production")
      };
      Log.log(this.name + " - DOM elements cached");
    } else {
      Log.log(this.name + " - Could not find cache wrapper");
    }
  },
});