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
	}
    }
}