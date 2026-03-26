const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start () {
    console.log("[MMM-ShellyEMMeter] node_helper started");
    this._uri      = null;   // URL oggetto configurato dal client
    this._fetching = false;  // guard: evita fetch sovrapposte
  },

  /** Restituisce un AbortSignal con timeout. Compatibile con Node < 17. */
  _timeoutSignal (ms) {
    if (typeof AbortSignal?.timeout === "function") return AbortSignal.timeout(ms);
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), ms);
    return ctrl.signal;
  },

  socketNotificationReceived (notification, payload) {
    if (notification === "CONFIG") {
      try {
        const u = new URL(payload.localuri);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error(`protocollo non consentito: ${u.protocol}`);
        }
        this._uri = u;
        console.log("[MMM-ShellyEMMeter] URI configurato:", this._uri.href);
      } catch (e) {
        console.error("[MMM-ShellyEMMeter] localuri non valido:", e.message);
      }
      return;
    }

    if (notification === "SHELLYEM") {
      if (!this._uri) {
        console.warn("[MMM-ShellyEMMeter] richiesta ignorata: CONFIG mancante");
        return;
      }
      if (this._fetching) {
        console.warn("[MMM-ShellyEMMeter] fetch precedente ancora in corso, saltata");
        return;
      }

      this._fetching = true;

      fetch(this._uri, { method: "GET", signal: this._timeoutSignal(5000) })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          this.sendSocketNotification("ShellyEMData", data);
        })
        .catch((err) => {
          const msg = err?.message ?? String(err);
          console.error("[MMM-ShellyEMMeter] fetch error:", msg);
          this.sendSocketNotification("ShellyEMError", { message: msg });
        })
        .finally(() => {
          this._fetching = false;
        });
    }
  },
});
