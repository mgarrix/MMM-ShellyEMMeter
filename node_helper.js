const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start: function () {
    console.log("[MMM-ShellyEMMeter] node_helper started");
    this._baseUri = null;       // URL dello Shelly preso dalla config
    this._allowed = new Set();  // whitelist host:porta consentiti
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "CONFIG") {
      // Atteso: payload.localuri = "http://192.168.x.x/status"
      try {
        const u = new URL(payload.localuri);
        const key = `${u.hostname}:${u.port || (u.protocol === "https:" ? "443" : "80")}`;
        this._allowed.add(key);
        this._baseUri = u;
        console.log("[MMM-ShellyEMMeter] configured base URI:", this._baseUri.toString());
      } catch (e) {
        console.error("[MMM-ShellyEMMeter] invalid localuri:", e.message);
      }
      return;
    }

    if (notification === "SHELLYEM") {
      if (!this._baseUri) {
        console.warn("[MMM-ShellyEMMeter] request ignored: missing CONFIG/localuri");
        return;
      }

      // Usa sempre l'URL dalla config (non prendere URL da eventi esterni)
      const reqUrl = this._baseUri.toString();
      const { hostname, port, protocol } = new URL(reqUrl);
      const key = `${hostname}:${port || (protocol === "https:" ? "443" : "80")}`;

      // Permetti solo http/https sullo stesso host/porta configurati
      if (!this._allowed.has(key) || (protocol !== "http:" && protocol !== "https:")) {
        console.warn("[MMM-ShellyEMMeter] blocked unexpected request:", reqUrl);
        return;
      }

      axios.get(reqUrl, {
        timeout: 5000,          // evita attese infinite
        maxRedirects: 0,        // niente redirect (riduce superfici di attacco)
        transitional: { clarifyTimeoutError: true }
      })
      .then((res) => {
        this.sendSocketNotification("ShellyEMData", res.data);
      })
      .catch((err) => {
        console.error("[MMM-ShellyEMMeter] fetch error:", err.message);
      });
    }
  }
});
