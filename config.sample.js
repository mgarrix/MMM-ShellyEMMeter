{
    module: "MMM-ShellyEMMeter",
    position: "top_right",
    header: "Shelly EM Meter",
    config: {
        refreshInterval: 15, // seconds
        localuri: "http://<<Shelly EM IP address>>/status",
	voltageScale: {
		nominal: 230,           // V
		tolerancePercent: 10,   // ±10%
		// optional override:
		//min: 100,	// V
		//max: 245,	// V
	},
	// Max scale for gauges (W) – adjust to your system
	maxProduction: 1500,   // photovoltaic peak power
	maxGrid:       3300,   // max grid power
    }
}