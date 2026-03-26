Module.register("MMM-ShellyEMMeter", {
  everySeconds: 5,

  ShellyEMDataObj: {
    voltage: 0,
    power1: 0,
    total1: 0,
    total_returned1: 0,
    power2: 0,
    total2: 0,
    total_returned2: 0
  },

  config: null,
  domCreated: false,
  domElements: null,

  // SVG layout constants (all in SVG user units)
  G: {
    W: 280, H: 258,
    r: 46, sw: 7,
    prod:   { x: 140, y: 60  },
    cons:   { x: 58,  y: 200 },
    grid:   { x: 222, y: 200 },
    center: { x: 140, y: 153 },
    // Connection endpoints (arc outer edge + 6px, toward center)
    eProd:  { x: 140, y: 112 },
    eCons:  { x: 103, y: 174 },
    eGrid:  { x: 177, y: 174 }
  },

  defaults: {
    message: "Please setup config.js",
    maxProduction: 4600,   // W
    maxGrid:       4600,   // W
  },

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  init () {
    Log.log(`${this.name} is in init!`);
  },

  start () {
    Log.log(`Starting module: ${this.name}`);
    this.voltageBounds = this.computeVoltageBounds(this.config.voltageScale);
    const r = this.G.r;
    this.gaugeCirc  = 2 * Math.PI * r;
    this.gaugeTrack = this.gaugeCirc * 0.75;
    this.gaugeGap   = this.gaugeCirc * 0.25;
  },

  loaded (callback) {
    Log.log(`${this.name} is loaded!`);
    callback();
  },

  getStyles () {
    return ["MMM-ShellyEM.css"];
  },


  // ─── Helpers ──────────────────────────────────────────────────────────────

  computeVoltageBounds (cfg = {}) {
    const nominal = Number(cfg.nominal) || 230;
    const tol     = Number(cfg.tolerancePercent);
    if (Number.isFinite(cfg.min) && Number.isFinite(cfg.max)) {
      return { min: cfg.min, max: cfg.max };
    }
    const t = Number.isFinite(tol) ? tol : 10;
    return {
      min: +(nominal * (1 - t / 100)).toFixed(1),
      max: +(nominal * (1 + t / 100)).toFixed(1),
    };
  },

  /** stroke-dasharray string for a gauge arc. */
  arcDash (value, maxValue) {
    const pct    = Math.max(0, Math.min(1, value / maxValue));
    const filled = this.gaugeTrack * pct;
    return `${filled.toFixed(1)} ${(this.gaugeCirc - filled).toFixed(1)}`;
  },

  /** CSS animation-duration: faster = more power flowing. */
  flowSpeed (power) {
    const s = Math.max(0.3, 1.5 / (1 + Math.abs(power) / 1000));
    return `${s.toFixed(1)}s`;
  },

  /** Stroke colour for the consumption flow line.
   *  green = solar only, red = grid only, blue = both. */
  consFlowColor (prod, grid, th = 50) {
    if (prod > th && grid > th) return "#4a9eff";   // rete + solare → blu
    if (prod > th)              return "#00cc44";   // solo solare  → verde
    return "#ff4444";                               // solo rete    → rosso
  },

  setFlow (el, active, speed) {
    if (!el) return;
    if (active) {
      el.style.animationDuration = speed ?? "0.8s";
      el.classList.add("flow-active");
    } else {
      el.classList.remove("flow-active");
    }
  },

  // ─── Notifications ────────────────────────────────────────────────────────

  notificationReceived (notification, payload, sender) {
    if (notification === "ALL_MODULES_STARTED") {
      this.sendSocketNotification("CONFIG", this.config);
    }
    if (sender?.name === "clock") {
      this.everySeconds--;
      if (this.everySeconds <= 0) {
        this.everySeconds = this.config.refreshInterval;
        this.sendSocketNotification("SHELLYEM");
      }
    }
  },

  socketNotificationReceived (notification, payload) {
    Log.log(`${this.name} socket notification: ${notification}`);
    if (notification === "ShellyEMData") {
      this.ShellyEMDataObj.voltage         = payload.emeters[0].voltage;
      this.ShellyEMDataObj.power1          = payload.emeters[0].power;
      this.ShellyEMDataObj.power2          = payload.emeters[1].power;
      this.ShellyEMDataObj.total1          = payload.emeters[0].total;
      this.ShellyEMDataObj.total_returned1 = payload.emeters[0].total_returned;
      this.ShellyEMDataObj.total2          = payload.emeters[1].total;
      this.ShellyEMDataObj.total_returned2 = payload.emeters[1].total_returned;

      if (this.domCreated) {
        this.updateValues();
      } else {
        this.updateDom(150);
      }
    }
  },

  // ─── Update (no DOM rebuild) ───────────────────────────────────────────────

  updateValues () {
    if (!this.domElements) {
      this.cacheElements();
      if (!this.domElements) {
        Log.log(`${this.name} – DOM elements not found, rebuilding`);
        this.domCreated = false;
        this.updateDom(150);
        return;
      }
    }

    const prod = Math.max(0, this.ShellyEMDataObj.power2);
    const grid = this.ShellyEMDataObj.power1;
    const cons = Math.max(0, prod + grid);

    const maxProd = this.config.maxProduction ?? this.defaults.maxProduction;
    const maxGrid = this.config.maxGrid       ?? this.defaults.maxGrid;
    const maxCons = maxProd + maxGrid;

    if (this.domElements.arcProd) {
      this.domElements.arcProd.setAttribute("stroke-dasharray", this.arcDash(prod, maxProd));
      this.domElements.valProd.textContent = Math.round(prod);
    }
    this.updateConsGauge(cons, grid, maxCons);
    this.updateGridGauge(grid, maxGrid);
    this.updateVoltage();

    const th = 50;
    this.setFlow(this.domElements.flowProd,    prod > th,   this.flowSpeed(prod));
    this.setFlow(this.domElements.flowCons,    cons > th,   this.flowSpeed(cons));
    this.setFlow(this.domElements.flowGridIn,  grid > th,   this.flowSpeed(grid));
    this.setFlow(this.domElements.flowGridOut, grid < -th,  this.flowSpeed(grid));

    // Colore dinamico flusso consumo
    if (this.domElements.flowCons) {
      this.domElements.flowCons.style.stroke = this.consFlowColor(prod, grid, th);
    }
  },

  updateConsGauge (cons, grid, maxCons) {
    if (!this.domElements.arcCons) return;
    const gridShare  = Math.max(0, grid);
    const solarShare = cons - gridShare;
    const circ       = this.gaugeCirc;
    const solarLen   = this.gaugeTrack * Math.max(0, Math.min(1, solarShare / maxCons));
    const gridConLen = this.gaugeTrack * Math.max(0, Math.min(1, gridShare  / maxCons));

    this.domElements.arcCons.setAttribute("stroke-dasharray",
      `${solarLen.toFixed(1)} ${(circ - solarLen).toFixed(1)}`);
    this.domElements.valCons.textContent = Math.round(cons);

    const el2 = this.domElements.arcCons2;
    if (!el2) return;
    if (gridConLen >= 1) {
      el2.setAttribute("stroke-dasharray",  `${gridConLen.toFixed(1)} ${(circ - gridConLen).toFixed(1)}`);
      el2.setAttribute("stroke-dashoffset", (circ - solarLen).toFixed(1));
      el2.style.display = "";
    } else {
      el2.style.display = "none";
    }
  },

  updateGridGauge (grid, maxGrid) {
    if (!this.domElements.arcGrid) return;
    const colorGrid = grid < 0 ? "#00cc44" : "#ff4444";
    this.domElements.arcGrid.setAttribute("stroke-dasharray", this.arcDash(Math.abs(grid), maxGrid));
    this.domElements.arcGrid.setAttribute("stroke", colorGrid);
    this.domElements.valGrid.textContent  = Math.round(Math.abs(grid));
    this.domElements.valGrid.style.fill   = colorGrid;
  },

  /** Interpolate the gradient colour at a given 0-100 percentage.
   *  Mirrors the CSS gradient: red→yellow→green→yellow→red */
  voltageColor (pct) {
    let r, g;
    if      (pct <= 25) { r = 255; g = Math.round( pct        / 25 * 255); }
    else if (pct <= 50) { r = Math.round((50 - pct) / 25 * 255); g = 255;  }
    else if (pct <= 75) { r = Math.round((pct - 50) / 25 * 255); g = 255;  }
    else                { r = 255; g = Math.round((100 - pct) / 25 * 255); }
    return `rgb(${r},${g},0)`;
  },

  updateVoltage () {
    const de = this.domElements;
    if (!de?.voltageIndicator) return;
    const v    = this.ShellyEMDataObj.voltage;
    const minV = this.voltageBounds?.min ?? 195;
    const maxV = this.voltageBounds?.max ?? 255;
    const pct  = Math.max(0, Math.min(100, ((v - minV) / (maxV - minV)) * 100));
    const color = this.voltageColor(pct);

    de.voltageIndicator.style.left = `${pct}%`;
    de.voltageIndicator.style.setProperty("--vcolor", color);

    de.voltageValue.style.left        = `${pct}%`;
    de.voltageValue.textContent       = `${v} v`;
    de.voltageValue.style.borderColor = color;
  },

  // ─── DOM Build ────────────────────────────────────────────────────────────

  getDom () {
    const wrapper = document.createElement("div");
    wrapper.className = "shellyEMWrapper";

    const prod = Math.max(0, this.ShellyEMDataObj.power2);
    const grid = this.ShellyEMDataObj.power1;
    const cons = Math.max(0, prod + grid);

    const maxProd = this.config.maxProduction ?? this.defaults.maxProduction;
    const maxGrid = this.config.maxGrid       ?? this.defaults.maxGrid;
    const maxCons = maxProd + maxGrid;

    wrapper.innerHTML =
      `<div class="voltage-bar-container">
         <div class="voltage-bar">
           <div class="voltage-gradient"></div>
           <div class="voltage-indicator" id="shellyem-voltage-indicator"></div>
           <div class="voltage-value"      id="shellyem-voltage-value">${this.ShellyEMDataObj.voltage} v</div>
         </div>
       </div>` +
      this.buildTriangleSVG(prod, cons, grid, maxProd, maxCons, maxGrid);

    this.domCreated = true;

    setTimeout(() => {
      this.cacheElements();
      this.updateVoltage();
    }, 100);

    return wrapper;
  },

  buildTriangleSVG (prod, cons, grid, maxProd, maxCons, maxGrid) {
    const g     = this.G;
    const track = this.gaugeTrack.toFixed(1);
    const gap   = this.gaugeGap.toFixed(1);
    const { r, sw } = g;

    const th  = 50;
    const fP  = prod > th,  fC  = cons > th;
    const fGI = grid > th,  fGO = grid < -th;

    const colorGrid = grid < 0 ? "#00cc44" : "#ff4444";

    const iconProd = this.file("svg/Panels.svg");
    const iconCons = this.file("svg/Home.svg");
    const iconGrid = this.file("svg/Grid.svg");

    // valStyle: optional inline style; arc2: optional second arc {stroke,dash,offset,hidden}
    const makeGauge = (gp, arcDash, stroke, value, iconUrl, id, opts = {}) => {
      const { valStyle = "", arc2 = null } = opts;
      const styleAttr = valStyle ? ` style="${valStyle}"` : "";
      const arc2Display = arc2?.hidden ? "display:none" : "";
      const arc2El    = arc2 ? `
          <circle id="shellyem-arc2-${id}" cx="0" cy="0" r="${r}" fill="none"
            stroke="${arc2.stroke}" stroke-width="${sw}" stroke-linecap="round"
            stroke-dasharray="${arc2.dash}" stroke-dashoffset="${arc2.offset}"
            style="${arc2Display}"
            transform="rotate(135)" />` : "";
      return `
        <g transform="translate(${gp.x},${gp.y})">
          <circle cx="0" cy="0" r="${r}" fill="none"
            stroke="#252525" stroke-width="${sw}"
            stroke-dasharray="${track} ${gap}" transform="rotate(135)" />
          <circle id="shellyem-arc-${id}" cx="0" cy="0" r="${r}" fill="none"
            stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"
            stroke-dasharray="${arcDash}" transform="rotate(135)" />${arc2El}
          <text x="0" y="-24" text-anchor="middle" class="gauge-unit">W</text>
          <text id="shellyem-val-${id}" x="0" y="0"
            text-anchor="middle" dominant-baseline="middle"
            class="gauge-value"${styleAttr}>${Math.round(value)}</text>
          <image href="${iconUrl}" x="-10" y="22" width="20" height="20" style="filter:invert(1)"/>
        </g>`;
    };

    // Consumption split: solar share (blue) + grid withdrawal share (red)
    const gridShare   = Math.max(0, grid);
    const solarShare  = cons - gridShare;
    const circ        = this.gaugeCirc;
    const solarLen    = this.gaugeTrack * Math.max(0, Math.min(1, solarShare / maxCons));
    const gridConLen  = this.gaugeTrack * Math.max(0, Math.min(1, gridShare  / maxCons));
    const arc2Cons    = {
      stroke: "#ff4444",
      dash:   `${gridConLen.toFixed(1)} ${(circ - gridConLen).toFixed(1)}`,
      offset: (circ - solarLen).toFixed(1),   // positions grid segment right after solar
      hidden: gridConLen < 1
    };

    return `
    <svg viewBox="0 0 ${g.W} ${g.H}" class="shellyEM-triangle-svg">
      <!-- Connection lines -->
      <line class="conn-line" x1="${g.eProd.x}" y1="${g.eProd.y}" x2="${g.center.x}" y2="${g.center.y}"/>
      <line class="conn-line" x1="${g.eCons.x}" y1="${g.eCons.y}" x2="${g.center.x}" y2="${g.center.y}"/>
      <line class="conn-line" x1="${g.eGrid.x}" y1="${g.eGrid.y}" x2="${g.center.x}" y2="${g.center.y}"/>
      <!-- Center node -->
      <circle cx="${g.center.x}" cy="${g.center.y}" r="5" class="center-dot"/>

      <!-- Flow: Production → Center -->
      <line id="shellyem-flow-prod"     class="flow-line flow-prod     ${fP  ? "flow-active" : ""}"
        x1="${g.eProd.x}"  y1="${g.eProd.y}"  x2="${g.center.x}" y2="${g.center.y}"/>
      <!-- Flow: Center → Consumption -->
      <line id="shellyem-flow-cons"     class="flow-line flow-cons     ${fC  ? "flow-active" : ""}"
        style="stroke:${this.consFlowColor(prod, grid, th)}"
        x1="${g.center.x}" y1="${g.center.y}" x2="${g.eCons.x}"  y2="${g.eCons.y}"/>
      <!-- Flow: Grid → Center (prelievo) -->
      <line id="shellyem-flow-grid-in"  class="flow-line flow-grid-in  ${fGI ? "flow-active" : ""}"
        x1="${g.eGrid.x}"  y1="${g.eGrid.y}"  x2="${g.center.x}" y2="${g.center.y}"/>
      <!-- Flow: Center → Grid (immissione) -->
      <line id="shellyem-flow-grid-out" class="flow-line flow-grid-out ${fGO ? "flow-active" : ""}"
        x1="${g.center.x}" y1="${g.center.y}" x2="${g.eGrid.x}"  y2="${g.eGrid.y}"/>

      ${makeGauge(g.prod, this.arcDash(prod,           maxProd), "#f0a500", prod,            iconProd, "prod")}
      ${makeGauge(g.cons, `${solarLen.toFixed(1)} ${(circ - solarLen).toFixed(1)}`,
                          "#4a9eff", cons, iconCons, "cons", { arc2: arc2Cons })}
      ${makeGauge(g.grid, this.arcDash(Math.abs(grid), maxGrid), colorGrid, Math.abs(grid), iconGrid, "grid", { valStyle: `fill:${colorGrid}` })}
    </svg>`;
  },

  cacheElements () {
    const wrapper =
      document.querySelector(`.${this.identifier} .shellyEMWrapper`) ??
      document.querySelector(".shellyEMWrapper");

    if (wrapper) {
      this.domElements = {
        voltageIndicator: wrapper.querySelector("#shellyem-voltage-indicator"),
        voltageValue:     wrapper.querySelector("#shellyem-voltage-value"),
        arcProd:          wrapper.querySelector("#shellyem-arc-prod"),
        arcCons:          wrapper.querySelector("#shellyem-arc-cons"),
        arcCons2:         wrapper.querySelector("#shellyem-arc2-cons"),
        arcGrid:          wrapper.querySelector("#shellyem-arc-grid"),
        valProd:          wrapper.querySelector("#shellyem-val-prod"),
        valCons:          wrapper.querySelector("#shellyem-val-cons"),
        valGrid:          wrapper.querySelector("#shellyem-val-grid"),
        flowProd:         wrapper.querySelector("#shellyem-flow-prod"),
        flowCons:         wrapper.querySelector("#shellyem-flow-cons"),
        flowGridIn:       wrapper.querySelector("#shellyem-flow-grid-in"),
        flowGridOut:      wrapper.querySelector("#shellyem-flow-grid-out"),
      };
      Log.log(`${this.name} – DOM elements cached`);
    } else {
      Log.log(`${this.name} – Could not find wrapper for caching`);
    }
  },
});

