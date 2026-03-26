# Changelog

All notable changes to this project will be documented in this file.

---

## [1.2.0] - 2026-03-27

### Changed
- Reworked UI with triangle SVG layout and three circular gauges (Production, Consumption, Grid).
- Animated dashed flow lines between nodes.
- Split consumption arc: solar share (blue) + grid withdrawal share (red).
- Dynamic grid gauge colour: green when feeding into grid, red when drawing from grid.
- DOM update strategy: incremental `updateValues()` path avoids full DOM rebuild on every data tick.
- `maxProduction` and `maxGrid` configuration options to set gauge full-scale values.

---

## [1.1.0] - 2025-08-23

### Added
- Voltage bar with gradient indicator showing mains voltage relative to a configurable nominal range.
- `voltageScale` configuration option (`nominal`, `tolerancePercent`, optional `min`/`max` override).

---

## [1.0.0] - 2023-08-14

### Added
- Initial release.
- Basic display of Shelly EM data (power, voltage, totals) via LAN polling.
- Configurable `refreshInterval` and `localuri`.
- Italian and English translations.



