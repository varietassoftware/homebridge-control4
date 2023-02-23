var Service, Characteristic;
var request = require("request");
var http = require("http");
var pollingtoevent = require('polling-to-event');

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-control4", "Control4", HttpAccessory);
}

function HttpAccessory(log, config)
{
    this.log = log;
    
    // url info
    this.service                = config["service"] || "Switch";
    this.base_url               = config["base_url"];
    this.enable_status          = config["has_on_state"] || "yes"
    this.enable_power_control   = config["has_power_control"] || "yes";
    this.enable_level           = config["has_level_control"] || "no";
    this.invert_contact         = config["invert_contact"] || "no";
    this.include_video          = config["include_video"] || "yes";
    
    if( this.service == "Security" || this.service == "Motion" || this.service == "Doorbell" || this.service == "Blinds" )
        this.enable_power_control = "no";
    
    if( this.enable_power_control == "yes" )
    {
        if( this.service == "Garage Door" )
        {
            this.on_url               = this.base_url + "/close";
            this.on_body              = config["open_body"];
            this.off_url              = this.base_url + "/open";
            this.off_body             = config["close_body"];
        }
        else if( this.service == "Lock" )
        {
            this.on_url               = this.base_url + "/lock";
            this.on_body              = config["open_body"];
            this.off_url              = this.base_url + "/unlock";
            this.off_body             = config["close_body"];
        }
        else
        {
            this.on_url                 = this.base_url + "/on";
            this.on_body                = config["on_body"];
            this.off_url                = this.base_url + "/off";
            this.off_body               = config["off_body"];
        }
    }
   
    if( this.service == "Blinds" )
    {
	this.level_url             = this.base_url + "/set_blinds_target/%t";
    }
    if( this.service == "Thermostat" )
    {
        this.set_mode_url          = this.base_url + "/set_hvac_mode/%m";
        this.get_mode_url          = this.base_url + "/hvac_mode";
        this.get_status_url        = this.base_url + "/hvac_status";
        this.set_target_heat_url   = this.base_url + "/set_heat_setpoint/%c";
        this.set_target_cool_url   = this.base_url + "/set_cool_setpoint/%c";
        this.get_target_heat_url   = this.base_url + "/heat_setpoint";
        this.get_target_cool_url   = this.base_url + "/cool_setpoint";
        this.get_temperature_url   = this.base_url + "/temperature";
        
        this.cool_string = config["cool_string"] || "Cool";
        this.heat_string = config["heat_string"] || "Heat";
        this.off_string = config["off_string"] || "Off";
        this.auto_string = config["auto_string"] || "Auto";
    }

    var that = this;

    var key1Val = 0;
    var key2Val = 0;
    var key3Val = 0;
    var key4Val = 0;
    var key5Val = 0;
    var key6Val = 0;
    
    const requestHandler = (request, response) => {
        console.log(request.url)
        
        var parts = request.url.split("/")
        var prop = parts[1]
        var value = parts[2]
        
        console.log("Received update to property("+prop+") with value("+value+")")
       
        if( that.service == "Keypad" )
        {
            var binaryState = parseInt(value.replace(/\D/g,""));
	    var keypad = parseInt(prop.replace(/\D/g,""));
            console.log("Detected keypad "+prop+" button event ("+value+").  Calling service update.");
            switch (keypad) {
                case 1:
                {
		    that.key1Val = binaryState;
                    that.keypadService1.updateCharacteristic(Characteristic.ProgrammableSwitchEvent,binaryState);
                    break;
                }
                case 2:
                {
		    that.key2Val = binaryState;
                    that.keypadService2.updateCharacteristic(Characteristic.ProgrammableSwitchEvent,binaryState);
                    break;
                }
                case 3:
                {
		    that.key3Val = binaryState;
                    that.keypadService3.updateCharacteristic(Characteristic.ProgrammableSwitchEvent,binaryState);
                    break;
                }
                case 4:
                {
		    that.key4Val = binaryState;
                    that.keypadService4.updateCharacteristic(Characteristic.ProgrammableSwitchEvent,binaryState);
                    break;
                }
                case 5:
                {
		    that.key5Val = binaryState;
                    that.keypadService5.updateCharacteristic(Characteristic.ProgrammableSwitchEvent,binaryState);
                    break;
                } 
                case 6: 
                {
		    that.key6Val = binaryState;
                    that.keypadService6.updateCharacteristic(Characteristic.ProgrammableSwitchEvent,binaryState);
                    break;
                }
                default: 
                    break;
            }
            return;
        }
 
        if( prop == 1000 )
        {
            var binaryState = parseInt(value.replace(/\D/g,""));
            that.state = binaryState > 0;
            that.log(that.service, "received power",that.status_url, "state is currently", binaryState);
            
            // switch used to easily add additonal services
            that.enableSet = false;
            switch (that.service) {
                case "Switch":
                    if (that.switchService ) {
                        that.switchService .getCharacteristic(Characteristic.On)
                        .setValue(that.state);
                    }
                    break;
                case "Light":
                case "Dimmer":
                    if (that.lightbulbService) {
                        that.lightbulbService.getCharacteristic(Characteristic.On)
                        .setValue(that.state||that.currentlevel>0);
                    }
                    break;
                case "Speaker":
                    if (that.speakerService) {
                        that.speakerService.getCharacteristic(Characteristic.Mute)
                        .setValue(!that.state);
                    }
                    break;
                case "Door":
                    if (that.doorService) {
                        that.doorService.getCharacteristic(Characteristic.CurrentPosition)
                        .setValue(that.state?0:100);
                        that.doorService.getCharacteristic(Characteristic.TargetPosition)
                        .setValue(that.state?0:100);
                        that.doorService.getCharacteristic(Characteristic.PositionState)
                        .setValue(2);
                    }
                    break;
                case "Window":
                    if (that.windowService) {
                        that.windowService.getCharacteristic(Characteristic.CurrentPosition)
                        .setValue(that.state?0:100);
                        that.windowService.getCharacteristic(Characteristic.TargetPosition)
                        .setValue(that.state?0:100);
                        that.windowService.getCharacteristic(Characteristic.PositionState)
                        .setValue(2);
                    }
                    break;
                case "Garage Door":
                    if( that.garageService ) {
                        that.targetGarageDoorState = that.state?Characteristic.CurrentDoorState.CLOSED:Characteristic.CurrentDoorState.OPEN;
                        that.garageService.getCharacteristic(Characteristic.CurrentDoorState)
                        .setValue(that.targetGarageDoorState);
                        that.garageService.getCharacteristic(Characteristic.TargetDoorState)
                        .setValue(that.targetGarageDoorState);
                    }
                    break;
                case "Lock":
                    if( that.lockService ) {
                        that.lockService.getCharacteristic(Characteristic.LockCurrentState)
                        .setValue(!that.state?Characteristic.LockCurrentState.SECURED:Characteristic.LockCurrentState.UNSECURED);
                        that.lockService.getCharacteristic(Characteristic.LockTargetState)
                        .setValue(!that.state?Characteristic.LockTargetState.SECURED:Characteristic.LockTargetState.UNSECURED);
                    }
                    break;
                case "Contact":
                    if( that.contactService ) {
                        var toCheck = true;
                        if( that.invert_contact == "yes" ) {
                          toCheck = false;
                        }
                        that.contactService.getCharacteristic(Characteristic.ContactSensorState)
                        .setValue((that.state==toCheck)?Characteristic.ContactSensorState.CONTACT_DETECTED:Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                    }
                    break;
                case "Doorbell":
                    if( that.doorbellService ) {
                        var toCheck = true;
                        if( that.invert_contact == "yes" ) {
                            toCheck = false;
                        }
                        if( that.state == toCheck && that.state != that.lastState ) {
                            that.lastSent = !that.lastSent;
                            
                            that.doorbellService.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                            .setValue(that.lastSent?1:0);
                        }
                        that.lastState = that.state;
                    }
                    break;
                case "Motion":
                    if( that.motionService ) {
                        that.motionService.getCharacteristic(Characteristic.MotionDetected).setValue(!that.state);
                    }
                    break;
                case "Fan":
                    if( that.fanService ) {
                        that.fanService.getCharacteristic(Characteristic.On).
                        setValue(that.state);
                    }
                    break;
                case "Security":
                    that.httpRequest(that.status_url, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body)
                                     {
                                     if (error)
                                     {
                                     that.log('HTTP get power function failed: %s', error.message);
                                     return;
                                     }
                                     else
                                     {
                                     var binaryState = parseInt(body.replace(/\D/g,""));
                                     that.log('Received security system state: ',binaryState);
                                     that.state = binaryState > 0;
                                     if( that.securityService && binaryState < 10 )
                                     {
                                     if( binaryState < 5 ) {
                                     that.secCurState = binaryState;
                                     that.secTarState = binaryState;
                                     } else {
                                     that.secTarState = 3;
				     that.secCurState = 3;
                                     }
                                     that.enableSet = false;
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState).
                                     setValue(that.secCurState);
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemTargetState).
                                     setValue(that.secTarState);
                                     that.enableSet = true;
                                     }
                                     }
                                     });
                    break;
            }
            that.enableSet = true;
        }
        else if( prop == 1001 )
        {
            that.currentlevel = parseInt(value);
            that.state = that.currentlevel > 0;
            
            that.enableSet = false;
            switch (that.service) {
                case "Light":
                case "Dimmer":
                    if( that.currentLevel < 0 ) {
                        that.currentLevel = 0;
                    }
                    if( that.currentLevel > 100 ) {
                        that.currentLevel = 100;
                    }
                    if (that.lightbulbService) {
                        that.log(that.service, "received brightness",that.brightnesslvl_url, "level is currently", that.currentlevel);
                        that.lightbulbService.getCharacteristic(Characteristic.Brightness)
                        .setValue(that.currentlevel);
                        that.lightbulbService.getCharacteristic(Characteristic.On)
                        .setValue(that.state);
                    }
                    break;
                case "Speaker":
                    if( that.currentLevel < 0 ) {
                        that.currentLevel = 0;
                    }
                    if( that.currentLevel > 100 ) {
                        that.currentLevel = 100;
                    }
                    if( that.speakerService) {
                        that.log(that.service, "received volume",that.brightnesslvl_url, "volume is currently", that.currentlevel);
                        that.speakerService.getCharacteristic(Characteristic.Volume).setValue(that.currentlevel);
                        that.speakerService.getCharacteristic(Characteristic.Mute).setValue(!that.state);
                    }
                    break;
                case "Fan":
                    if( that.currentLevel < 0 ) {
                        that.currentLevel = 0;
                    }
                    if( that.currentLevel > 100 ) {
                        that.currentLevel = 100;
                    }
                    if( that.fanService ) {
                        that.log(that.service, "received fan level",that.brightnesslvl_url, "level is currently", that.currentlevel);
                        that.fanService.getCharacteristic(Characteristic.RotationSpeed)
                        .setValue(that.currentlevel*25);
                    }
                    break;
                case "Security":
                    that.httpRequest(that.status_url, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body) {
                                     if (error) {
                                     that.log('HTTP get power function failed: %s', error.message);
                                     return;
                                     } else {
                                     var binaryState = parseInt(body.replace(/\D/g,""));
			             that.log('Received security system status: ',binaryState);
                                     that.state = binaryState > 0;
                                     if( that.securityService && binaryState < 10 ) {
                                     if( binaryState < 5 ) {
                                     that.secCurState = binaryState;
                                     that.secTarState = binaryState;
                                     } else {
                                     that.secTarState = 0;
                                     }
                                     that.enableSet = false;
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState).
                                     setValue(that.secCurState);
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemTargetState).
                                     setValue(that.secTarState);
                                     that.enableSet = true;
                                     }
                                     }});
                    break;
            }
            that.enableSet = true;
        }
	else if( prop == 1002 )
	{
	    switch (that.service) {
	        case "Blinds":
		    if( that.blindsService ) {
			var isStopped = parseInt(value.replace(/\D/g,""));
			that.log(that.service, "received update to stopped motion state: ",isStopped);
			if( isStopped == 1 ) {
			    that.blindState = Characteristic.PositionState.STOPPED;
			    that.enableSet = false;
			    that.blindsService.getCharacteristic(Characteristic.PositionState).setValue(that.blindState);
			    that.enableSet = true;
			}
		    }
		    break;
		
	        case "Security":
		    that.httpRequest(that.status_url, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body)
				 {
				     if (error)
				     {
					 that.log('HTTP get power function failed: %s', error.message);
					 return;
				     }
				     else
				     {
					 var binaryState = parseInt(body.replace(/\D/g,""));
					 that.log('Received security system state: ',binaryState);
					 that.state = binaryState > 0;
					 if( that.securityService && binaryState < 10 )
					 {
					     if( binaryState < 5 ) {
						 that.secCurState = binaryState;
						 that.secTarState = binaryState;
					     } else {
						 that.secTarState = 3;
						 that.secCurState = 3;
					     }
					     that.enableSet = false;
					     that.securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState).
						 setValue(that.secCurState);
					     that.securityService.getCharacteristic(Characteristic.SecuritySystemTargetState).
						 setValue(that.secTarState);
					     that.enableSet = true;
					 }
				     }
				 });
		    break;
	    }
	}
	else if( prop == 1004 )
	{
	    switch (that.service) {
	        case "Blinds":
		    if( that.blindsService ) {
			that.blindPosition = parseInt(value.replace(/\D/g,""));
                        if( that.blindPosition < 0 )
                            that.blindPosition = 0;
                        if( that.blindPosition > 100 )
                            that.blindPosition = 100;
			that.log(that.service, "received update to blind level: ",that.blindPosition);
			that.enableSet = false;
			that.blindsService.getCharacteristic(Characteristic.CurrentPosition).setValue(that.blindPosition);
			that.enableSet = true;
		    }
		    break;
	    }
	}
        else if( prop == 1005 )
	{
	    switch (that.service) {
	        case "Blinds":
		    if( that.blindsService ) {
			that.blindTarget = parseInt(value.replace(/\D/g,""));
                        if( that.blindTarget < 0 ) {
                            that.blindTarget = 0;
                        }
                        if( that.blindTarget > 100 ) {
                            that.blindTarget = 100;
                        }
			that.log(that.service, "received update to blind target level: ",that.blindTarget);
			that.enableSet = false;
			that.blindsService.getCharacteristic(Characteristic.TargetPosition).setValue(that.blindTarget);
			that.enableSet = true;
		    }
		    break;
	    }
	}
        else if( prop == 1008 )
	{
	    switch (that.service) {
	        case "Blinds":
		    if( that.blindsService ) {
			var isOpening = parseInt(value.replace(/\D/g,""));
			if( isOpening == 1 ) {
			    that.blindState = Characteristic.PositionState.INCREASING;
			    that.enableSet = false;
			    //that.blindsService.getCharacteristic(Characteristic.PositionState).setValue(that.blindState);
			    that.enableSet = true;
			} else {
			    that.blindState = Characteristic.PositionState.STOPPED;
			    that.enableSet = false;
			    //that.blindsService.getCharacteristic(Characteristic.PositionState).setValue(that.blindState);
			    that.enableSet = true;
			}
			that.log(that.service, "received update to opening motion state: ",isOpening);
		    }
		    break;
	    }
	}
        else if( prop == 1009 )
	{
	    switch (that.service) {
	        case "Blinds":
		    if( that.blindsService ) {
			var isClosing = parseInt(value.replace(/\D/g,""));
			if( isClosing == 1 ) {
			    that.blindState = Characteristic.PositionState.DECREASING;
			    that.enableSet = false;
			    //that.blindsService.getCharacteristic(Characteristic.PositionState).setValue(that.blindState);
			    that.enableSet = true;
			} else {
			    that.blindState = Characteristic.PositionState.STOPPED;
			    that.enableSet = false;
			    //that.blindsService.getCharacteristic(Characteristic.PositionState).setValue(that.blindState);
			    that.enableSet = true;
			}
			that.log(that.service, "received update to closing motion state: ",isClosing);
		    }
		    break;
	    }
	}
        else if( prop == 1107 ) // HVAC Status
        {
            var state = Characteristic.TargetHeatingCoolingState.OFF;
            if( value.includes(that.cool_string) )
            {   
                state = Characteristic.TargetHeatingCoolingState.COOL;
            }
            else if( value.includes(that.heat_string) )
            {   
                state = Characteristic.TargetHeatingCoolingState.HEAT;
            }
            else if( value.includes(that.auto_string) )
            {   
                state = Characteristic.TargetHeatingCoolingState.AUTO;
            }
  
            if( state >= 0 && state <= 2 )
            {
              that.thermStatus = state;
              that.log(that.service, "received hvac status",that.get_status_url, "hvac status is currently", value);
              that.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).setValue(state);  
            }
            else
            {
              that.log(that.service, "received invalid hvac status",state,"from data",value);
            } 
        }
        else if( prop == 1104 ) // HVAC Mode
        {
            that.enableSetTemp = false;
            that.enableSetState = false;
            var state = Characteristic.TargetHeatingCoolingState.OFF;
            if( value == that.cool_string )
            {
                state = Characteristic.TargetHeatingCoolingState.COOL;
            }
            else if( value == that.heat_string )
            {
                state = Characteristic.TargetHeatingCoolingState.HEAT;
            }
            else if( value == that.auto_string )
            {
                state = Characteristic.TargetHeatingCoolingState.AUTO;
            }
            
            that.log(that.service, "received hvac mode",that.get_mode_url, "hvac mode is currently", state, "from value", value);
            that.thermTarState = state;
            that.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).setValue(that.thermTarState);
            
            if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
            {
                //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                {
                    var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                    if( coolDiff < 0 )
                        coolDiff = coolDiff*-1;
                    
                    var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                    if( heatDiff < 0 )
                        heatDiff = heatDiff*-1;
                    
                    if( coolDiff < heatDiff )
                        state = Characteristic.TargetHeatingCoolingState.COOL;
                    else
                        state = Characteristic.TargetHeatingCoolingState.HEAT;
                }
                else
                {
                    state = Characteristic.TargetHeatingCoolingState.OFF;
                }
            }
            
            if( state == Characteristic.TargetHeatingCoolingState.COOL && that.thermCoolSet != -100 )
            {
                if( that.thermCoolSet >= 10 && that.thermCoolSet <= 38 )
                  that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermCoolSet);
                else
                  that.log(that.service, "Cool setpoint is outside of valid range.  Cannot set target temperature: ",that.thermCoolSet);
            }
            if( state == Characteristic.TargetHeatingCoolingState.HEAT && that.thermHeatSet != -100 )
            {
                if( that.thermHeatSet >= 10 && that.thermHeatSet <= 38 )
                  that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermHeatSet);
                else
                  that.log(that.service, "Heat setpoint is outside of valid range.  Cannot set target temperature: ",that.thermHeatSet);
            }
            that.enableSetTemp = true;
            that.enableSetState = true;
        }
        else if( prop == 1131 ) // Temp
        {
            if( that.thermostatService )
            {
                that.log(that.service, "received current temperature",that.get_temperature_url, "temperature is currently", value);
                that.thermCurrentTemp = parseFloat(value);
                if( that.thermCurrentTemp >= 10 && that.thermCurrentTemp <= 38 )
                  that.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).setValue(parseFloat(value));
                else
                  that.log(that.service, "Received temperature is outside of valid range.  Cannot set temperature: ",that.thermCurrentTemp);
            }
        }
        else if( prop == 1133 ) // Heat setpoint
        {
            that.enableSetTemp = false;
            that.enableSetState = false;

            var state = Characteristic.TargetHeatingCoolingState.OFF;
            if( that.thermostatService )
            {
                that.log(that.service, "received current heat setpoint",that.set_target_heat_url, "heat setpoint is currently", value);
                that.thermHeatSet = parseFloat(value);

                var state = that.thermTarState;
                if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
                {
                    //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                    if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                    {
                        var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                        if( coolDiff < 0 )
                            coolDiff = coolDiff*-1;
                        
                        var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                        if( heatDiff < 0 )
                            heatDiff = heatDiff*-1;
                        
                        if( coolDiff < heatDiff )
                            state = Characteristic.TargetHeatingCoolingState.COOL;
                        else
                            state = Characteristic.TargetHeatingCoolingState.HEAT;
                    }
                    else
                    {
                        state = Characteristic.TargetHeatingCoolingState.OFF;
                    }
                }
                
                if( state == Characteristic.TargetHeatingCoolingState.HEAT )
                {
                    if( that.thermHeatSet >= 10 && that.thermHeatSet <= 38 )
                      that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermHeatSet);
                    else
                      that.log(that.service,"Current heat setpoint is outside of range.  Cannot set target temperature: ",that.thermHeatSet);
                }
            }
            that.enableSetTemp = true;
            that.enableSetState = true;
        }
        else if( prop == 1135 ) // Cool setpoint
        {
            that.enableSetTemp = false;
            that.enableSetState = false;

            if( that.thermostatService )
            {
                that.log(that.service, "received current cool setpoint",that.set_target_cool_url, "cool setpoint is currently", value);
                that.thermCoolSet = parseFloat(value);

                var state = that.thermTarState;      
                if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
                {
                    //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                    if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                    {
                        var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                        if( coolDiff < 0 )
                            coolDiff = coolDiff*-1;
                        
                        var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                        if( heatDiff < 0 )
                            heatDiff = heatDiff*-1;
                        
                        if( coolDiff < heatDiff )
                            state = Characteristic.TargetHeatingCoolingState.COOL;
                        else
                            state = Characteristic.TargetHeatingCoolingState.HEAT;
                    }
                    else
                    {
                        state = Characteristic.TargetHeatingCoolingState.OFF;
                    }
                }
                
                if( state == Characteristic.TargetHeatingCoolingState.COOL )
                {
                    if( that.thermCoolSet >= 10 && that.thermCoolSet <= 38 )
                      that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermCoolSet);
                    else
                      that.log(that.service,"Current cool setpoint is outside of range.  Cannot set target temperature: ",that.thermCoolSet);
                }
            }
            
            that.enableSetTemp = true;
            that.enableSetState = true;
        }
        else
        {
            that.enableSet = false;
            switch (that.service) {
                case "Security":
                    that.httpRequest(that.status_url, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body) {
                                     if (error) {
                                     that.log('HTTP get power function failed: %s', error.message);
                                     return;
                                     } else {
                                     var binaryState = parseInt(body.replace(/\D/g,""));
                                     that.log('Received security system state: ',binaryState);
                                     that.state = binaryState > 0;
                                     if( that.securityService && binaryState < 10 ) {
                                     if( binaryState < 5 ) {
                                     that.secCurState = binaryState;
                                     that.secTarState = binaryState;
                                     } else {
                                     that.secTarState = 0;
                                     }
                                     that.enableSet = false;
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState).
                                     setValue(that.secCurState);
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemTargetState).
                                     setValue(that.secTarState);
                                     that.enableSet = true;
                                     }
                                     }});
                    break;
            }
            that.enableSet = true;
        }
        response.end('OK')
    }
    
    const server = http.createServer(requestHandler)
    const port = this.base_url.substr(this.base_url.lastIndexOf('/')+1)*1+10000;
    
    //console.log('Starting server on port '+port+' for service '+that.service)
    {
      server.listen(port, (err) =>
                  {
                    if (err)
                    {
                      return console.log('something bad happened', err)
                    }
                  
                    //console.log(`server is listening on ${port}`)
                  
                    'use strict';
                  
                    var os = require('os');
                    var ifaces = os.networkInterfaces();
                  
                    Object.keys(ifaces).forEach(function (ifname)
                            {
                              var alias = 0;
                                              
                              ifaces[ifname].forEach(function (iface)
                                   {
                                     if ('IPv4' !== iface.family || iface.internal !== false)
                                     {
                                       // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                                       return;
                                     }
                                                                     
                                     if (alias >= 1)
                                     {
                                       // this single interface has multiple ipv4 addresses
                                       //console.log(ifname + ':' + alias, iface.address);
                                     }
                                     else
                                     {
                                       // this interface has only one ipv4 adress
                                       //console.log(ifname, iface.address);
                                                                     
                                       //console.log("Calling: "+that.base_url+"/SetApplianceIP/"+iface.address)
                                       request(that.base_url+"/SetApplianceIP/"+iface.address,
                                               function (error, response, body)
                                               {
                                                 if (!error && response.statusCode == 200)
                                                 {
                                                   //console.log(body) // Print the google web page.
                                                 }
                                               })
                                     }
                                     ++alias;
                                   });
                           });
                  })
    }
    
    if( this.enable_status == "yes" )
    {
        if( this.service == "Light" || this.service == "Dimmer" || this.service == "Switch" || this.service == "Speaker" || this.service == "Fan" )
            this.status_url = this.base_url + "/light_state";
        else if( this.service == "Door" || this.service == "Garage Door" || this.service == "Window" ||
                this.service == "Contact" || this.service == "Motion" || this.service == "Lock" || this.service == "Doorbell" )
            this.status_url = this.base_url + "/contact_state";
        else
            this.status_url = this.base_url + "/status";
    }
    
    if( this.enable_level == "yes" )
    {
        if( this.service == "Fan" )
        {
            this.brightness_url       = this.base_url + "/fan/%b";
            this.brightnesslvl_url    = this.base_url + "/brightness";
        }
        else
        {
            this.brightness_url         = this.base_url + "/level/%b";
            this.brightnesslvl_url      = this.base_url + "/brightness";
        }
    }
    
    if( this.service == "Security" )
    {
        this.state_url = this.base_url + "/state/%s";
    }
    
    {
      this.http_method            = config["http_method"] 	  	 	|| "GET";;
      this.http_brightness_method = config["http_brightness_method"]  || this.http_method;
      this.username               = config["username"] 	  	 	 	|| "";
      this.password               = config["password"] 	  	 	 	|| "";
      this.sendimmediately        = config["sendimmediately"] 	 	|| "";
      this.name                   = config["name"];
      this.manufacturer           = config["manufacturer"]            || "Unknown";
      this.model                  = config["model"]                   || "Unknown";
      this.serial                 = config["serial"]                  || "Unknown";

      this.refresh_interval       = config["refresh_interval"]        || 900000;
      this.refresh_interval = this.refresh_interval + (Math.floor(Math.random()*300000) - 300000); // Random value between 10 and 20 minutes. 
      if( this.refresh_interval <= 0 )
        this.refresh_interval = 900000 + (Math.floor(Math.random()*300000) - 300000);
      this.log(this.service, "set refresh interval to",this.refresh_interval);

      this.brightnessHandling     = config["brightnessHandling"] 	 	|| "no";
      this.switchHandling 	    = config["switchHandling"] 		 	|| "no";
    }
    
    //realtime polling info
    this.state = false;
    this.lastSent = false;
    this.lastState = false;
    this.blindPosition = 0;
    this.newBlindTarget = -1;
    this.blindTarget = 0;
    this.blindState = 2;
    if( this.invert_contact == "yes" )
        this.lastState = true;
    this.secTarState = 3;
    this.secCurState = 3;
    this.targetGarageDoorState = Characteristic.TargetDoorState.CLOSED;
    this.currentlevel = 0;
    this.enableSet = true;
    this.enableSetState = true;
    this.enableSetTemp = true;
    this.thermCurState = Characteristic.TargetHeatingCoolingState.OFF;
    this.thermStatus = Characteristic.TargetHeatingCoolingState.OFF;
    this.thermHeatSet = -100;
    this.thermDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
    this.thermCoolSet = -100;
    this.thermCurrentTemp = -100;
    this.thermTarState = Characteristic.TargetHeatingCoolingState.OFF;
    this.garageCheck = -1;

    // Status Polling, if you want to add additional services that don't use switch handling you can add something like this || (this.service=="Smoke" || this.service=="Motion"))
    if (this.status_url && this.switchHandling =="realtime")
    {
        var powerurl = this.status_url;
        var curhvacstateurl = "";
        var curheatseturl = "";
        var curcoolseturl = "";
        var curtempurl = "";
        
        if( this.service != "Thermostat" && this.service != "Blinds" )
        {
            var statusemitter = pollingtoevent(function(done)
                                               {
                                                 that.httpRequest(powerurl, "", "GET", that.username, that.password, that.sendimmediately,
                                                                  function(error, response, body)
                                                                  {
                                                                    if (error)
                                                                    {
                                                                      done(error, null);
                                                                    }
                                                                    else
                                                                    {
                                                                      done(null, body);
                                                                    }
                                                                  })
                                               }, {longpolling:true,interval:this.refresh_interval,longpollEventName:"statuspoll"});
                   
                    statusemitter.on("error", function(err, data) {
                      that.log('HTTP get power function failed: %s', err.message);
                    });

		    statusemitter.on("statuspoll",
                             function(data)
                             {
                               if( data == null || data.length == 0 )
                                 return;

                               var binaryState = parseInt(data.replace(/\D/g,""));
                               that.state = binaryState > 0;
                               that.log(that.service, "received power",that.status_url, "state is currently", binaryState);
                             
                               that.enableSet = false;
                               switch (that.service)
                               {
                                 case "Switch":
                                   if (that.switchService )
                                   {
                                     that.switchService.getCharacteristic(Characteristic.On).setValue(that.state);
                                   }
                                   break;
                                 case "Light":
                                 case "Dimmer":
                                   if (that.lightbulbService)
                                   {
                                     that.lightbulbService.getCharacteristic(Characteristic.On).setValue(that.state||that.currentlevel>0);
                                   }
                                   break;
                                 case "Speaker":
                                   if( that.speakerService) {
                                     that.speakerService.getCharacteristic(Characteristic.Mute).setValue(!that.state);
                                   }
                                   break;
                                 case "Door":
                                   if (that.doorService)
                                   {
                                     that.doorService.getCharacteristic(Characteristic.CurrentPosition).setValue(that.state?0:100);
                                     that.doorService.getCharacteristic(Characteristic.TargetPosition).setValue(that.state?0:100);
                                     that.doorService.getCharacteristic(Characteristic.PositionState).setValue(2);
                                   }
                                   break;
                                 case "Window":
                                   if (that.windowService)
                                   {
                                     that.windowService.getCharacteristic(Characteristic.CurrentPosition).setValue(that.state?0:100);
                                     that.windowService.getCharacteristic(Characteristic.TargetPosition).setValue(that.state?0:100);
                                     that.windowService.getCharacteristic(Characteristic.PositionState).setValue(2);
                                   }
                                   break;
                                 case "Garage Door":
                                   if( that.garageService )
                                   {
                                     that.targetGarageDoorState = that.state?Characteristic.CurrentDoorState.CLOSED:Characteristic.CurrentDoorState.OPEN;
                                     that.garageService.getCharacteristic(Characteristic.CurrentDoorState).setValue(that.targetGarageDoorState);
                                     that.garageService.getCharacteristic(Characteristic.TargetDoorState).setValue(that.targetGarageDoorState);
                                   }
                                   break;
                                 case "Lock":
                                   if( that.lockService )
                                   {
                                     that.lockService.getCharacteristic(Characteristic.LockCurrentState).setValue(!that.state?Characteristic.LockCurrentState.SECURED:Characteristic.LockCurrentState.UNSECURED);
                                     that.lockService.getCharacteristic(Characteristic.LockTargetState).setValue(!that.state?Characteristic.LockTargetState.SECURED:Characteristic.LockTargetState.UNSECURED);
                                   }
                                   break;
                                 case "Contact":
                                   if( that.contactService )
                                   {
                                     var toCheck = true;
                                     if( that.invert_contact == "yes" ) {
                                       toCheck = false;
                                     }
                                     that.contactService.getCharacteristic(Characteristic.ContactSensorState).setValue((that.state==toCheck)?Characteristic.ContactSensorState.CONTACT_DETECTED:Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                                   }
                                   break;
                                 case "Doorbell":
                                   if( that.doorbellService )
                                   {
                                     var toCheck = true;
                                     if( that.invert_contact == "yes" )
                                     {
                                       toCheck = false;
                                     }
                                     if( that.state == toCheck && that.state != that.lastState )
                                     {
                                       that.lastSent = !that.lastSent;
                                   
                                       that.doorbellService.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setValue(that.lastSent?1:0);
                                     }
                                     that.lastState = that.state;
                                   }
                                   break;
                                 case "Motion":
                                   if( that.motionService )
                                   {
                                     that.motionService.getCharacteristic(Characteristic.MotionDetected).setValue(!that.state);
                                   }
                                   break;
                                 case "Fan":
                                   if( that.fanService )
                                   {
                                     that.fanService.getCharacteristic(Characteristic.On).setValue(that.state);
                                   }
                                   break;
                                 case "Security":
                                   if( that.securityService && binaryState < 10 )
                                   {
                                     if( binaryState < 5 )
                                     {
                                       that.secCurState = binaryState;
                                       that.secTarState = binaryState;
                                     }
                                     else
                                     {
                                       that.secTarState = 0;
                                     }
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState).setValue(that.secCurState);
                                     that.securityService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(that.secTarState);
                                   }
                                   break;
                                 }
                                 that.enableSet = true;
                            });
        }
	else if( this.service == "Blinds" )
	{
	  {
            var blindurl = this.base_url + "/blinds_target";
            var blindtargetemitter = pollingtoevent(function(done)
		    				{
		    				  that.httpRequest(blindurl, "", "GET", that.username, that.password, that.sendimmediately,
							  function(error, response, body)
							  {
							    if (error)
						            {
							      done(error,null);
						            }
						            else
							    {
						              done(null,body);
						            }
						          })
		   				}, {longpolling:true,interval:this.refresh_interval,longpollEventName:"blindtargetstatuspoll"});

	    blindtargetemitter.on("error", function(err,data) {
              that.log("HTTP get blind target status function failed: %s", err.message);
	    });

            blindtargetemitter.on("blindtargetstatuspoll",
                               function(data)
                               {
                                 if( data == null || data.length == 0 )
                                   return;

                                 that.blindTarget = parseInt(data);
                                 if( that.blindTarget < 0 ) {
                                     that.blindTarget = 0;
                                 }
                                 if( that.blindTarget > 100 ) {
                                     that.blindTarget = 100;
                                 }
				 if( that.newBlindTarget == -1 ) {
			           that.newBlindTarget = that.blindTarget;
				 }
                                 that.log(that.service, "received blind target ",blindurl, " blind target level is currently", data);

                                 that.enableSetState = false;
                                 that.blindsService.getCharacteristic(Characteristic.TargetPosition).setValue(that.blindTarget);
                                 that.enableSetState = true;
                               });

	  }
	  {
            var blindurl = this.base_url + "/blinds_level";
            var blindposemitter = pollingtoevent(function(done)
		    				{
		    				  that.httpRequest(blindurl, "", "GET", that.username, that.password, that.sendimmediately,
							  function(error, response, body)
							  {
							    if (error)
						            {
							      done(error,null);
						            }
						            else
							    {
						              done(null,body);
						            }
						          })
		   				}, {longpolling:true,interval:this.refresh_interval,longpollEventName:"blindposstatuspoll"});

	    blindposemitter.on("error", function(err,data) {
              that.log("HTTP get blind position status function failed: %s", err.message);
	    });

            blindposemitter.on("blindposstatuspoll",
                               function(data)
                               {
                                 if( data == null || data.length == 0 )
                                   return;

                                 that.blindPosition = parseInt(data);
                                 if( that.blindPosition < 0 ) {
                                     that.blindPosition = 0;
                                 }
                                 if( that.blindPosition > 100 ) {
                                     that.blindPosition = 100;
                                 }
                                 that.log(that.service, "received blind position ",blindurl, " blind level is currently", that.blindPosition);

                                 that.enableSetState = false;
                                 that.blindsService.getCharacteristic(Characteristic.CurrentPosition).setValue(that.blindPosition);
                                 that.enableSetState = true;
                               });

          }
	}
        else
        {
          // Emitter for current hvac status
          {
            curhvacstatusurl = this.get_status_url;
            var hvacstatusemitter = pollingtoevent(function(done)
                                                 {
                                                   that.httpRequest(curhvacstatusurl, "", "GET", that.username, that.password, that.sendimmediately,
                                                                    function(error, response, body)
                                                                    {
                                                                      if (error)
                                                                      {
                                                                        done(error,null);
                                                                      }
                                                                      else
                                                                      {
                                                                        done(null, body);
                                                                      }
                                                                    })
                                                 }, {longpolling:true,interval:this.refresh_interval,longpollEventName:"hvacstatuspoll"});

            hvacstatusemitter.on("error", function(err,data) {
              that.log('HTTP get hvac status function failed: %s', err.message);
            });

            hvacstatusemitter.on("hvacstatuspoll",
                               function(data)
                               {
                                 if( data == null || data.length == 0 )
                                   return;

                                 var state = Characteristic.TargetHeatingCoolingState.OFF;
                                 if( data.includes(that.cool_string) )
                                 {
                                    state = Characteristic.TargetHeatingCoolingState.COOL;
                                 }
                                 else if( data.includes(that.heat_string) )
                                 {
                                    state = Characteristic.TargetHeatingCoolingState.HEAT;
                                 }
                                 that.thermCurState = state;

                                 that.log(that.service, "received hvac status",that.get_status_url, "hvac status is currently", data);

                                 that.enableSetState = false;
                                 if( state >= 0 && state <= 2 )
                                   that.thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).setValue(state);
                                 else
                                   that.log(that.service,"Received hvac status that is out of range.  Cannot set status: ",state," from data: ",data);

                                 that.enableSetState = true;
                               });
          }

          // Emitter for current hvac mode
          {
            curhvacstateurl = this.get_mode_url;
            var hvacmodeemitter = pollingtoevent(function(done)
                                                 {
                                                   that.httpRequest(curhvacstateurl, "", "GET", that.username, that.password, that.sendimmediately,
                                                                    function(error, response, body)
                                                                    {
                                                                      if (error)
                                                                      {
                                                                        done(error,null);
                                                                      }
                                                                      else
                                                                      {
                                                                        done(null, body);
                                                                      }
                                                                    })
                                                 }, {longpolling:true,interval:this.refresh_interval+2000,longpollEventName:"hvacstatepoll"});
            
            hvacmodeemitter.on("error", function(err,data) {
              that.log('HTTP get hvac state function failed: %s', err.message);
            });

            hvacmodeemitter.on("hvacstatepoll",
                               function(data)
                               {
                                 if( data == null || data.length == 0 )
                                   return;

                                 var state = Characteristic.TargetHeatingCoolingState.OFF;
                                 if( data == that.cool_string )
                                 {
                                    state = Characteristic.TargetHeatingCoolingState.COOL;
                                 }
                                 else if( data == that.heat_string )
                                 {
                                    state = Characteristic.TargetHeatingCoolingState.HEAT;
                                 }
                                 else if( data == that.auto_string )
                                 {
                                    state = Characteristic.TargetHeatingCoolingState.AUTO;
                                 }
                               
                                 that.log(that.service, "received hvac mode",that.get_mode_url, "hvac mode is currently", data);
                                 that.thermTarState = state;
                                 that.enableSetState = false;
                                 that.thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).setValue(that.thermTarState);
                                 that.enableSetState = true;

                                 if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
                                 {
                                    //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                                    if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                                    {
                                        var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                                        if( coolDiff < 0 )
                                            coolDiff = coolDiff*-1;
                               
                                        var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                                        if( heatDiff < 0 )
                                            heatDiff = heatDiff*-1;
                               
                                        if( coolDiff < heatDiff )
                                            state = Characteristic.TargetHeatingCoolingState.COOL;
                                        else
                                            state = Characteristic.TargetHeatingCoolingState.HEAT;
                                    }
                                    else
                                    {
                                        state = Characteristic.TargetHeatingCoolingState.OFF;
                                    }
                                 }
                               
                                 that.enableSetTemp = false;
                                 if( state == Characteristic.TargetHeatingCoolingState.COOL && that.thermCoolSet != -100 )
                                 {
                                    if( that.thermCoolSet >= 10 && that.thermCoolSet <= 38 )
                                      that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermCoolSet);
                                    else
                                      that.log(that.service,"Current cool setpoint is outside of range.  Cannot set target temperature: ",that.thermCoolSet);
                                 }
                                 if( state == Characteristic.TargetHeatingCoolingState.HEAT && that.thermHeatSet != -100 )
                                 {
                                    if( that.thermHeatSet >= 10 && that.thermHeatSet <= 38 )
                                      that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermHeatSet);
                                    else
                                      that.log(that.service,"Current heat setpoint is outside of range.  Cannot set target temperature: ",that.thermHeatSet);
                                 }
                                 that.enableSetTemp = true;
                               });
          }
         
          // Emitter for current heat setpoint
          {
                curheatseturl = this.get_target_heat_url;
                var hvacheatsetemitter = pollingtoevent(function(done)
                                                     {
                                                     that.httpRequest(curheatseturl, "", "GET", that.username, that.password, that.sendimmediately,
                                                                      function(error, response, body)
                                                                      {
                                                                        if (error)
                                                                        {
                                                                          done(error, null);
                                                                        }
                                                                        else
                                                                        {
                                                                          done(null, body);
                                                                        }
                                                                      })
                                                     }, {longpolling:true,interval:this.refresh_interval+4000,longpollEventName:"hvacheatpoll"});
                
                hvacheatsetemitter.on("error", function(err, data) {
                  that.log('HTTP get hvac heat setpoint function failed: %s', err.message); 
                });

                hvacheatsetemitter.on("hvacheatpoll",
                                   function(data)
                                   {
                                     if( data == null || data.length == 0 )
                                       return;

                                     that.thermHeatSet = parseFloat(data);

                                     that.log(that.service, "received hvac heat setpoint",that.get_target_heat_url, "hvac heat setpoint is currently", data);

                                     var state = that.thermTarState;
                                     if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
                                     {
                                        //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                                        if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                                        {
                                            var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                                            if( coolDiff < 0 )
                                                coolDiff = coolDiff*-1;
                                      
                                            var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                                            if( heatDiff < 0 )
                                                heatDiff = heatDiff*-1;
                                      
                                            if( coolDiff < heatDiff )
                                                state = Characteristic.TargetHeatingCoolingState.COOL;
                                            else
                                                state = Characteristic.TargetHeatingCoolingState.HEAT;
                                        }
                                        else
                                        {
                                            state = Characteristic.TargetHeatingCoolingState.OFF;
                                        }
                                     }

                                     that.enableSetTemp = false;
                                     if( state == Characteristic.TargetHeatingCoolingState.HEAT )
                                     {
                                       if( that.thermHeatSet >= 10 && that.thermHeatSet <= 38 )
                                         that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermHeatSet);
                                       else
                                         that.log(that.service,"Current heat setpoint is outside of range.  Cannot set current temperature: ",that.thermHeatSet);
                                     }
                                     that.enableSetTemp = true;
                                   });
          }

          // Emitter for current cool setpoint
          {
                curcoolseturl = this.get_target_cool_url;
                var hvaccoolsetemitter = pollingtoevent(function(done)
                                                        {
                                                        that.httpRequest(curcoolseturl, "", "GET", that.username, that.password, that.sendimmediately,
                                                                         function(error, response, body)
                                                                         {
                                                                           if (error)
                                                                           {
                                                                             done(error, null);
                                                                           }
                                                                           else
                                                                           {
                                                                             done(null, body);
                                                                           }
                                                                         })
                                                        }, {longpolling:true,interval:this.refresh_interval+6000,longpollEventName:"hvaccoolpoll"});
                
                hvaccoolsetemitter.on("error", function(err, data) {
                  that.log('HTTP get hvac cool setpoint function failed: %s', err.message); 
                });

                hvaccoolsetemitter.on("hvaccoolpoll",
                                      function(data)
                                      {
                                        if( data == null || data.length == 0 )
                                          return;

                                        that.thermCoolSet = parseFloat(data);

                                        that.log(that.service, "received hvac cool setpoint",that.get_target_cool_url, "hvac cool setpoint is currently", data);
                                      
                                        var state = that.thermTarState;
                                        if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
                                        {
                                            //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                                            if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                                            {
                                                var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                                                if( coolDiff < 0 )
                                                    coolDiff = coolDiff*-1;
                                      
                                                var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                                                if( heatDiff < 0 )
                                                    heatDiff = heatDiff*-1;
                                      
                                                if( coolDiff < heatDiff )
                                                    state = Characteristic.TargetHeatingCoolingState.COOL;
                                                else
                                                    state = Characteristic.TargetHeatingCoolingState.HEAT;
                                            }
                                            else
                                            {
                                                state = Characteristic.TargetHeatingCoolingState.OFF;
                                            }
                                        }

                                        that.enableSetTemp = false;
                                        if( state == Characteristic.TargetHeatingCoolingState.COOL )
                                        {
                                          if( that.thermCoolSet >= 10 && that.thermCoolSet <= 38 )
                                            that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermCoolSet);
                                          else
                                            that.log(that.service,"Current cool setpoint is outside of range.  Cannot set target temperature: ",that.thermCoolSet);
                                        }
                                        that.enableSetTemp = true;
                                      });
            }
            
          // Emitter for current temperature
          {
                curtempurl = this.get_temperature_url;
                var hvactempemitter = pollingtoevent(function(done)
                                                        {
                                                        that.httpRequest(curtempurl, "", "GET", that.username, that.password, that.sendimmediately,
                                                                         function(error, response, body)
                                                                         {
                                                                           if (error)
                                                                           {
                                                                             done(error,null);
                                                                           }
                                                                           else
                                                                           {
                                                                             done(null, body);
                                                                           }
                                                                         })
                                                        }, {longpolling:true,interval:this.refresh_interval+8000,longpollEventName:"hvactemppoll"});
                
                hvactempemitter.on("error", function(err, data) {
                  that.log('HTTP get current temperature function failed: %s', err.message);
                });

                hvactempemitter.on("hvactemppoll",
                                      function(data)
                                      {
                                        if( data == null || data.length == 0 )
                                          return;

                                        that.thermCurrentTemp = parseFloat(data);
                                        that.log(that.service, "received current temperature",that.get_temperature_url, "temperature is currently", data);
 
                                        if( that.thermCurrentTemp >= 10 && that.thermCurrentTemp <= 38 )
                                          that.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).setValue(that.thermCurrentTemp);
                                        else
                                          that.log(that.service,"Received temperature that is outside of range.  Cannot set current temperature: ",that.thermCurrentTemp);

                                        var state = Characteristic.TargetHeatingCoolingState.OFF;
                                        if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
                                        {
                                            //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                                            if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                                            {
                                                var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                                                if( coolDiff < 0 )
                                                    coolDiff = coolDiff*-1;
                                   
                                                var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                                                if( heatDiff < 0 )
                                                    heatDiff = heatDiff*-1;
                                   
                                                if( coolDiff < heatDiff )
                                                    state = Characteristic.TargetHeatingCoolingState.COOL;
                                                else
                                                    state = Characteristic.TargetHeatingCoolingState.HEAT;
                                            }
                                            else
                                            {
                                                state = Characteristic.TargetHeatingCoolingState.OFF;
                                            }
                                        }
                                      });
            }

        }
    }
    
    // Brightness Polling
    if (this.brightnesslvl_url && this.brightnessHandling =="realtime")
    {
        var brightnessurl = this.brightnesslvl_url;
        var levelemitter = pollingtoevent(function(done)
                                          {
                                            that.httpRequest(brightnessurl, "", "GET", that.username, that.password, that.sendimmediately,
                                                             function(error, response, responseBody)
                                                             {
                                                               if (error)
                                                               {
                                                                 done(error, null);
                                                               }
                                                               else
                                                               {
                                                                 done(null, responseBody);
                                                               }
                                                             }) // set longer polling as slider takes longer to set value
                                          }, {longpolling:true,interval:this.refresh_interval,longpollEventName:"levelpoll"});
        
        levelemitter.on("error", function(err, data) {
          that.log('HTTP get power function failed: %s', err.message);
        });

        levelemitter.on("levelpoll",
                        function(data)
                        {
                          if( data == null || data.length == 0 )
                            return;

                          that.currentlevel = parseInt(data);
                          that.state = that.currentlevel > 0;

                          that.enableSet = false;
                        
                          switch (that.service)
                          {
                            case "Light":
                            case "Dimmer":
                              if( that.currentLevel < 0 ) {
                                  that.currentLevel = 0;
                              }
                              if( that.currentLevel > 100 ) {
                                  that.currentLevel = 100;
                              }
                              if (that.lightbulbService)
                              {
                                that.log(that.service, "received brightness",that.brightnesslvl_url, "level is currently", that.currentlevel);
                                that.lightbulbService.getCharacteristic(Characteristic.Brightness).setValue(that.currentlevel);
                                that.lightbulbService.getCharacteristic(Characteristic.On).setValue(that.state);
                              }
                              break;
                            case "Speaker":
                              if( that.currentLevel < 0 ) {
                                  that.currentLevel = 0;
                              }
                              if( that.currentLevel > 100 ) {
                                  that.currentLevel = 100;
                              }
                              if( that.speakerService) {
                                that.log(that.service, "received volume",that.brightnesslvl_url, "volume is currently", that.currentlevel);
                                that.speakerService.getCharacteristic(Characteristic.Volume).setValue(that.currentlevel);
                                that.speakerService.getCharacteristic(Characteristic.Mute).setValue(that.currentlevel==0);
                              } 
                              break;
                            case "Fan":
                              if( that.currentLevel < 0 ) {
                                  that.currentLevel = 0;
                              }
                              if( that.currentLevel > 100 ) {
                                  that.currentLevel = 100;
                              }
                              if( that.fanService )
                              {
                                that.log(that.service, "received fan level",that.brightnesslvl_url, "level is currently", that.currentlevel);
                                that.fanService.getCharacteristic(Characteristic.RotationSpeed).setValue(that.currentlevel*25);
                                that.fanService.getCharacteristic(Characteristic.On).setValue(that.state);
                              }
                              break;
                            }
                            that.enableSet = true;
                       });
    }
}

HttpAccessory.prototype =
{
  doRequest: function(url, body, method, username, password, sendimmediately, callback, errorCount)
               {
                            request({
                               url: url,
                              body: body,
                            method: method,
                rejectUnauthorized: false,
                              auth: {
                                user: username,
                                pass: password,
                     sendImmediately: sendimmediately
                                    }
                                  },
                            function(error, response, body)
                            {
                              if( errorCount < 5 && error )
                              {
                                this.log(this.service, "Failed calling service endpoint.  Retrying in 1 second.");
                                setTimeout(function() { this.doRequest(url,body,method,username,password,sendimmediately,callback,errorCount+1); }.bind(this),1000);
                              }
                              else
                              {
                                callback(error, response, body)
                              }
                            }.bind(this));
               },

  httpRequest: function(url, body, method, username, password, sendimmediately, callback)
               {
                 request('http://localhost/sig/sig.php',
                         function(error, response, body)
                         {
                           var sig = body;
                           var signed = url;
                           if( sig !== undefined && sig !== null && sig != "null" && sig.length > 0 && sig.length < 50 && !error )
                             signed = signed + "?" + sig;
            
                           this.doRequest(signed,body,method,username,password,sendimmediately,callback,0);
                         }.bind(this));
                },
    
  doSetSecurityState: function(callback, errorCount)
               {
                   var that = this;
                   var url;
                   var body;

                   url = that.state_url.replace("%s", that.secTarState);
                   that.log("Setting new security state: "+url);

                   that.httpRequest(url, body, that.http_method, that.username, that.password, that.sendimmediately,
                                    function(error, response, responseBody)
                                    {
                                      if (errorCount > 2 && error)
                                      {
                                        that.log('HTTP set security state function failed after 3 attempts: %s', error.message);
                                        callback(error);
                                      }
                                      else if(error)
                                      {
                                        that.log('HTTP set security state function failed.  Retrying after 1 second: %s', error.message);
                                        setTimeout(function() { that.doSetSecurityState(callback,errorCount+1); }.bind(that),1000);
                                      }
                                      else
                                      {
                                        that.log('HTTP set security state function succeeded!');
                                        callback();
                                      }
                                    }.bind(that));
               },

  setSecurityState: function(newState, callback)
               {
                 var that = this;
                 if (this.enableSet == true)
                 {
                   if (!this.state_url)
                   {
                     this.log.warn("Ignoring request; No security state url defined.");
                     callback(new Error("No security state url defined."));
                     return;
                   }
        
                   this.secTarState = newState;

                   setTimeout(function() { this.doSetSecurityState(callback,0); }.bind(this),1000);
                 }
                 else
                 {
                   callback();
                 }
               },
    
  doSetPowerState: function(url,body,callback,errorCount)
               {
                 this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately,
                                    function(error, response, responseBody)
                                    {
                                      if (errorCount > 2 && error )
                                      {
                                        this.log('HTTP set power function failed after 3 attempts: %s', error.message);
                                        callback(error);
                                      }
                                      else if (error)
                                      {
                                        this.log('HTTP set power function failed. Retrying after 1 second: %s', error.message);
                                        setTimeout(function() { this.doSetPowerState(url,body,callback,errorCount+1); }.bind(this),1000);
                                      }
                                      else
                                      {
                                        this.log('HTTP set power function succeeded!');
                                        callback();

                                        if(this.garageService)
                                        { 
                                          this.doRunGarageCheck();
                                        }
                                      }
                                    }.bind(this));
               },

  doRunGarageCheck: function()
               {
                 if( this.garageCheck != -1 )
                 {
                   clearInterval(this.garageCheck);
                   this.garageCheck = -1;
                 }
                 this.garageCheckCount = 0;

                 this.garageCheck = setInterval(function()
                 {
                   this.garageCheckCount++;
                   if( this.garageCheckCount > 30 )
                   {
                     if( this.garageCheck != -1 )
                     {
                       clearInterval(this.garageCheck);
                       this.garageCheck = -1;
                     }
                     return;
                   }

                   this.httpRequest(this.status_url, "", "GET", this.username, this.password, this.sendimmediately,
                                    function(error, response, body)
                                    {
                                      if (error)
                                      {
                                        this.log('HTTP get power function failed: %s', error.message);
                                        return;
                                      }
                                      else
                                      {
                                        var binaryState = parseInt(body.replace(/\D/g,""));
                                        this.state = binaryState > 0;
                                        this.log(this.service, "received power",this.status_url, "state is currently", binaryState);

                                        this.enableSet = false;
                                        this.garageService.getCharacteristic(Characteristic.CurrentDoorState)
                                                          .setValue(this.state?Characteristic.CurrentDoorState.CLOSED:Characteristic.CurrentDoorState.OPEN);
                                        this.enableSet = true;
                                      }
                                    }.bind(this))
                 }.bind(this),2000);
               },

  setPowerState: function(powerOn, callback)
               {
                 var that = this;
                 if( this.service == "Speaker" ) {
                   if( this.enable_level && this.brightness_url )
                   {
                     if( powerOn && this.currentlevel > 0 ) {
                       this.lastlevel = this.currentlevel;
                       this.log("Last level stored as",this.lastlevel);
                     }
                     this.setBrightness(powerOn?0:this.lastlevel,callback);
                   }
                   return;
                 }
                 if( this.enable_level && this.brightness_url && ((this.currentlevel == 0 && powerOn) || (this.currentlevel > 0 && !powerOn))  )
                 {
                   this.setBrightness(powerOn?100:0,callback);
                   return;
                 }
                 else if( this.enable_level && this.brightness_url )
                 {
                   this.log("Called set power state, but power is already at appropriate state. Doing nothing.");
                   callback();
                   return;
                 }

                 if (this.enableSet == true && (this.currentlevel == 0 || !powerOn ))
                 {
                   var url;
                   var body;

                   if( this.enable_level )
                     this.state = powerOn;
        
                   if (!this.on_url || !this.off_url)
                   {
                     this.log.warn("Ignoring request; No power url defined.");
                     callback(new Error("No power url defined."));
                     return;
                   }
        
                   if (powerOn)
                   {
                     url = this.on_url;
                     body = this.on_body;
                     this.log("Setting power state to on");
                   }
                   else
                   {
                     url = this.off_url;
                     body = this.off_body;
                     this.log("Setting power state to off");
                   } 

                   this.doSetPowerState(url,body,callback,0);
                }
                else
                {
                  callback();
                }
              },
    
  doSetBrightness: function(callback, errorCount)
              {
                     var that = this;
                     var url = that.brightness_url.replace("%b", that.currentlevel)

                     that.log("Setting brightness to %s", that.currentlevel);

                     that.httpRequest(url, "", that.http_brightness_method, that.username, that.password, that.sendimmediately,
                                      function(error, response, body)
                                      {
                                        if (errorCount > 2 && error)
                                        {
                                          that.log('HTTP brightness function failed after 3 attempts: %s', error);
                                          callback(error);
                                        }
                                        else if( error )
                                        {
                                          that.log('HTTP brightness function failed. Retrying in 1 second: %s', error);
                                          setTimeout(function() { that.doSetBrightness(callback,errorCount+1); }.bind(that),1000);
                                        }
                                        else
                                        {
                                          that.log('HTTP brightness function succeeded!');
                                          that.enableSet = false;
                                          if( that.lightbulbService ) {
                                            that.lightbulbService.getCharacteristic(Characteristic.On).setValue(that.currentlevel>0);
                                            that.lightbulbService.getCharacteristic(Characteristic.Brightness).setValue(that.currentlevel);
                                          }
                                          if( that.speakerService ) {
                                            that.speakerService.getCharacteristic(Characteristic.Mute).setValue(that.currentlevel==0);
                                            that.speakerService.getCharacteristic(Characteristic.Volume).setValue(that.currentlevel);
                                          }
                                          if( that.fanService ) {
                                            that.fanService.getCharacteristic(Characteristic.On).setValue(that.currentlevel>0);
                                            that.fanService.getCharacteristic(Characteristic.RotationSpeed).setValue(that.currentlevel*25);
                                          }
                                          that.enableSet = true;
                                          callback();
                                        }
                                      }.bind(that));
              },
  doSetBlindTarget: function(callback, errorCount)
              {
                     var that = this;
                     var url = that.level_url.replace("%t", that.newBlindTarget)

                     that.log("Setting blind level to %s", that.newBlindTarget);

                     that.httpRequest(url, "", "GET", that.username, that.password, that.sendimmediately,
                                      function(error, response, body)
                                      {
                                        if (errorCount > 2 && error)
                                        {
                                          that.log('Blind level function failed after 3 attempts: %s', error);
                                          callback(error);
                                        }
                                        else if( error )
                                        {
                                          that.log('Blind level function failed. Retrying in 1 second: %s', error);
                                          setTimeout(function() { that.doSetBlindTarget(callback,errorCount+1); }.bind(that),1000);
                                        }
                                        else
                                        {
					  that.blindTarget = parseInt(body);
                                          if( that.blindTarget < 0 ) {
                                              that.blindTarget = 0;
                                          }
                                          if( that.blindTarget > 100 ) {
                                              that.blindTarget = 100;
                                          }
                                          that.log('Blind level function succeeded! New blind target is %s',that.blindTarget);
					  setTimeout(function(){
				            that.enableSet = false;
				            that.blindsService.getCharacteristic(Characteristic.TargetPosition).setValue(that.blindTarget);
					    that.enableSet = true;
					  }, 400);
					  callback();
                                        }
                                      }.bind(that));
              },

  setBlindTarget: function(level, callback)
	       {
                 var that = this;
	         if (this.enableSet == true && level != -1 && this.newBlindTarget != -1 )
		 {
                   this.newBlindTarget = level;
	           setTimeout(function() { that.doSetBlindTarget(callback,0); }.bind(that),300);
		 }
	         else
	         {
		   callback();
		 }
	       },

  setBrightness: function(level, callback)
               {
                 var that = this;
                 if( !this.enable_level )
                 {
                   callback();
                   return;
                 }

                 if (this.enableSet == true)
                 {
                   if (!this.brightness_url)
                   {
                     this.log.warn("Ignoring request; No brightness url defined.");
                     callback(new Error("No brightness url defined."));
                     return;
                   }
        
                   if( this.service == "Fan" )
                       level = Math.round(level/25);
        
                   this.currentlevel = level;
                   if( this.currentLevel < 0 ) {
                       this.currentLevel = 0;
                   }
                   if( this.currentLevel > 100 ) {
                       this.currentLevel = 100;
                   }

                   setTimeout(function() { that.doSetBrightness(callback,0); }.bind(that),300);
                 }
                 else
                 {
                   callback();
                 }
               },

  doSetThermostatTargetHeatingCoolingState: function(url, state, callback, errorCount)
              {
                   this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately,
                                    function(error, response, body)
                                    {
                                        var that = this
                                        if( errorCount > 2 && error )
                                        {
                                            this.log('HTTP HVAC mode function failed after 3 attempts: %s', error);
                                            callback(error);
                                        }
                                        else if( error )
                                        {
                                            this.log('HTTP HVAC mode function failed. Retrying in 1 second: %s', error);
                                            setTimeout(function() { this.doSetThermostatTargetHeatingCoolingState(url,state,callback,errorCount+1); }.bind(this),1000);
                                        }
                                        else
                                        {
                                            this.log('HTTP HVAC mode function succeeded!');

                                            if( that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO)
                                            {
                                             //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                                             if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                                             {
                                               var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                                               if( coolDiff < 0 )
                                                 coolDiff = coolDiff*-1;

                                               var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                                               if( heatDiff < 0 )
                                                 heatDiff = heatDiff*-1;

                                               if( coolDiff < heatDiff )
                                                 state = Characteristic.TargetHeatingCoolingState.COOL;
                                               else
                                                 state = Characteristic.TargetHeatingCoolingState.HEAT;
                                              }
                                              else
                                              {
                                                state = Characteristic.TargetHeatingCoolingState.OFF;
                                              }
                                           }

                                           that.enableSetTemp = false;
                                           if( state == Characteristic.TargetHeatingCoolingState.COOL && that.thermCoolSet != -100 )
                                           {
                                             if( that.thermCoolSet >= 10 && that.thermCoolSet <= 38 )
                                               that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermCoolSet);
                                             else
                                               that.log(that.service,"Current cool setpoint is outside of range.  Cannot set target temperature: ",that.thermCoolSet);
                                           }
                                           if( state == Characteristic.TargetHeatingCoolingState.HEAT && that.thermHeatSet != -100 )
                                           {
                                             if( that.thermHeatSet >= 10 && that.thermHeatSet <= 38 )
                                               that.thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(that.thermHeatSet);
                                             else
                                               that.log(that.service,"Current heat setpoint is outside of range.  Cannot set target temperature: ",that.thermHeatSet);
                                           }
                                           that.enableSetTemp = true;

                                            callback();
                                        }
                                    }.bind(this));
              },

  setThermostatTargetHeatingCoolingState: function(state, callback)
               {
                   var that = this;
                   if( !this.enableSetState )
                   {
                       callback();
                       return;
                   }
                   
                   if( !this.set_mode_url )
                   {
                       this.log.warn("Ignoring request; No set mode url defined.");
                       callback(new Error("No set mode url defined."));
                       return;
                   }
                   
                   var mode = this.off_string;
                   if( state == Characteristic.TargetHeatingCoolingState.OFF )
                   {
                       mode = this.off_string;
                   }
                   else if( state == Characteristic.TargetHeatingCoolingState.HEAT )
                   {
                       mode = this.heat_string;
                   }
                   else if( state == Characteristic.TargetHeatingCoolingState.COOL )
                   {
                       mode = this.cool_string;
                   }
                   else if( state == Characteristic.TargetHeatingCoolingState.AUTO )
                   {
                       mode = this.auto_string;
                   }
 
                   this.thermTarState = state;
                  
                   var url = this.set_mode_url.replace("%m", mode);
                   
                   this.log("Setting hvac mode to %s", mode);
                   this.doSetThermostatTargetHeatingCoolingState(url,state,callback,0);   
               },

  doSetThermostatTargetTemp: function(url, callback, errorCount)
               {
                   this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately,
                         function(error, response, body)
                         {
                            if( errorCount > 2 && error )
                            {
                                this.log('HTTP HVAC setpoint function failed after 3 retries: %s', error);
                                callback(error);
                            }
                            else if( error )
                            {
                                this.log('HTTP HVAC setpoint function failed. Retrying in 1 second: %s', error);
                                setTimeout(function() { this.doSetThermostatTargetTemp(url,callback,errorCount+1); }.bind(this),1000);
                            }
                            else
                            {
                                this.log('HTTP HVAC setpoint function succeeded!');
                                callback();
                            }
                         }.bind(this));
               },

  setThermostatTargetTemp: function(temp, callback)
               {
                   var that = this;
                   if( !this.enableSetTemp )
                   {
                       callback();
                       return;
                   }
                   
                   if( temp == -100 )
                     return;

                   if( !this.set_target_cool_url || !this.set_target_heat_url )
                   {
                       this.log.warn("Ignoring request; Both set setpoint urls must be defined.");
                       callback(new Error("Both set setpoint urls must be defined."));
                       return;
                   }
        
                   var mode = this.thermTarState;
                   if( mode == Characteristic.TargetHeatingCoolingState.OFF ||
                       mode == Characteristic.TargetHeatingCoolingState.AUTO )
                   {
                       if( this.thermCurrentTemp != -100 && this.thermCoolSet != -100 && this.thermHeatSet != -100 )
                       {
                           var coolDiff = this.thermCurrentTemp - this.thermCoolSet;
                           if( coolDiff < 0 )
                               coolDiff = coolDiff*-1;
                           
                           var heatDiff = this.thermCurrentTemp - this.thermHeatSet;
                           if( heatDiff < 0 )
                               heatDiff = heatDiff*-1;
                           
                           if( coolDiff < heatDiff )
                               mode = Characteristic.TargetHeatingCoolingState.COOL;
                           else
                               mode = Characteristic.TargetHeatingCoolingState.HEAT;
                       }
                       else
                       {
                           mode = Characteristic.TargetHeatingCoolingState.COOL;
                       }
                   }
        
                   var url = this.set_target_heat_url.replace("%c",temp);
                   var modeString = "heat setpoint";
                   if( mode == Characteristic.TargetHeatingCoolingState.COOL )
                   {
                       url = this.set_target_cool_url.replace("%c",temp);
                       modeString = "cool setpoint";
                   }
        
                   this.log("Setting %s to %s", modeString, temp);
        
                   this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately,
                         function(error, response, body)
                         {
                            if( error )
                            {
                                this.log('HTTP HVAC setpoint function failed: %s', error);
                                callback(error);
                            }
                            else
                            {
                                this.log('HTTP HVAC setpoint function succeeded!');
                                callback();
                            }
                         }.bind(this));
              },

  identify: function(callback)
              {
                this.log("Identify requested!");
                callback(); // success
              },
    
  getServices: function()
              {
                  var that = this;
    
                  // you can OPTIONALLY create an information service if you wish to override
                  // the default values for things like serial number, model, etc.
                  var informationService = new Service.AccessoryInformation();
    
                  informationService
                    .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
                    .setCharacteristic(Characteristic.Model, this.model)
                    .setCharacteristic(Characteristic.SerialNumber, this.serial);
    
                  switch (this.service)
                  {
                      case "Switch":
                      {
                          this.switchService = new Service.Switch(this.name);
                          switch (this.switchHandling)
                          {
                              //Power Polling
                              case "yes":
                              case "realtime":
                                  this.switchService
                                    .getCharacteristic(Characteristic.On)
                                    .on('get', function(callback){ callback(null,that.state)})
                                    .on('set', this.setPowerState.bind(this));
                                  break;
                              default	:
                                  this.switchService
                                    .getCharacteristic(Characteristic.On)
                                    .on('set', this.setPowerState.bind(this));
                              break;
                          }
                          return [this.switchService];
                      }
                          
                      case "Light":
                      case "Dimmer":
                      {
                          this.lightbulbService = new Service.Lightbulb(this.name);
                          switch (this.switchHandling)
                          {
                              //Power Polling
                              case "yes" :
                              case "realtime" :
                                  this.lightbulbService
                                    .getCharacteristic(Characteristic.On)
                                    .on('get', function(callback){ callback(null,that.state||that.currentlevel>0)})
                                    .on('set', this.setPowerState.bind(this));
                                  break;
                              default:
                                  this.lightbulbService
                                    .getCharacteristic(Characteristic.On)
                                    .on('set', this.setPowerState.bind(this));
                                  break;
                          }
                          
                          // Brightness Polling
                          if (this.brightnessHandling == "realtime" || this.brightnessHandling == "yes")
                          {
                              this.lightbulbService
                                .addCharacteristic(new Characteristic.Brightness())
                                .on('get', function(callback) {callback(null,that.currentlevel)})
                                .on('set', this.setBrightness.bind(this));
                          }
            
                          return [informationService, this.lightbulbService];
                          break;
                      }
                          
                      case "Door":
                      {
                          this.doorService = new Service.Door(this.name);
                          this.doorService
                            .getCharacteristic(Characteristic.CurrentPosition)
                            .on('get', function(callback) {callback(null,that.state?0:100)});
                          
                          this.doorService
                            .getCharacteristic(Characteristic.TargetPosition)
                            .on('get', function(callback) {callback(null,that.state?0:100)})
                            .on('set', this.setPowerState.bind(this));
                          
                          this.doorService
                            .getCharacteristic(Characteristic.PositionState)
                            .on('get', function(callback) {callback(null,2)});
                          
                          return [informationService, this.doorService];
                          break;
                      }
                          
                      case "Window":
                      {
                          this.windowService = new Service.Window(this.name);
                          this.windowService
                            .getCharacteristic(Characteristic.CurrentPosition)
                            .on('get', function(callback) {callback(null,that.state?0:100)});
                          
                          this.windowService
                            .getCharacteristic(Characteristic.TargetPosition)
                            .on('get', function(callback) {callback(null,that.state?0:100)})
                            .on('set', this.setPowerState.bind(this));
                          
                          this.windowService
                            .getCharacteristic(Characteristic.PositionState)
                            .on('get', function(callback) {callback(null,2)});
                          
                          return [informationService, this.windowService];
                          break;
                      }
                          
                      case "Garage Door":
                      {
                          this.garageService = new Service.GarageDoorOpener(this.name);
                          this.garageService
                            .getCharacteristic(Characteristic.CurrentDoorState)
                            .on('get', function(callback) {callback(null,that.state?Characteristic.CurrentDoorState.CLOSED:Characteristic.CurrentDoorState.OPEN)});
                          
                          this.garageService
                            .getCharacteristic(Characteristic.TargetDoorState)
                            .on('get', function(callback) {callback(null,that.targetGarageDoorState)})
                            .on('set', this.setPowerState.bind(this));
                          
                          this.garageService
                            .getCharacteristic(Characteristic.ObstructionDetected)
                            .on('get', function(callback) {callback(null,false)});
                          
                          return [informationService, this.garageService];
                          break;
                      }
                         
	              case "Blinds":
		      {
			  this.blindsService = new Service.WindowCovering(this.name);
			  this.blindsService.getCharacteristic(Characteristic.CurrentPosition)
			      .on('get', function(callback) {callback(null,that.blindPosition)})

			  this.blindsService.getCharacteristic(Characteristic.TargetPosition)
			      .on('get', function(callback) {callback(null,that.blindTarget)})
			      .on('set', this.setBlindTarget.bind(this));

			  this.blindsService.getCharacteristic(Characteristic.PositionState)
			      .on('get', function(callback) {callback(null,2/*that.blindState*/)})
			  return [informationService, this.blindsService];
			  break;
		      }

                      case "Lock":
                      {
                          this.lockService = new Service.LockMechanism(this.name);
                          this.lockService
                            .getCharacteristic(Characteristic.LockCurrentState)
                            .on('get', function(callback) {callback(null,!that.state?Characteristic.LockCurrentState.SECURED:Characteristic.LockCurrentState.UNSECURED)});
                          
                          this.lockService
                            .getCharacteristic(Characteristic.LockTargetState)
                            .on('get', function(callback) {callback(null,!that.state?Characteristic.LockCurrentState.SECURED:Characteristic.LockCurrentState.UNSECURED)})
                            .on('set', this.setPowerState.bind(this));
                          
                          return [informationService, this.lockService];
                          break;
                      }

                      case "Speaker":
                      {
                          this.speakerService = new Service.Speaker(this.name);
                          this.speakerService
                            .getCharacteristic(Characteristic.Mute)
                            .on('get', function(callback) {
                              callback(null,that.state)
                            })
                            .on('set', this.setPowerState.bind(this));

                          this.speakerService
                            .getCharacteristic(Characteristic.Volume)
                            .on('get', function(callback) {
                              callback(null,that.currentLevel)
                            })
                            .on('set', this.setBrightness.bind(this));

                          return [informationService, this.speakerService];
                          break;
                      }
                          
                      case "Contact":
                      {
                          this.contactService = new Service.ContactSensor(this.name);
                          this.contactService
                            .getCharacteristic(Characteristic.ContactSensorState)
                            .on('get', function(callback) {
                                var toCheck = true;
                                if( that.invert_contact == "yes" ) {
                                  toCheck = false;
                                }
                                callback(null,(that.state==toCheck)?Characteristic.ContactSensorState.CONTACT_DETECTED:Characteristic.ContactSensorState.CONTACT_NOT_DETECTED)
                                });
                          
                          return [informationService, this.contactService];
                          break;
                      }
                          
                      case "Doorbell":
                      {
                          this.cameraService = new Service.CameraRTPStreamManagement(this.name);
                          this.doorbellService = new Service.Doorbell(this.name);
                          this.doorbellService
                            .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                            .on('get', function(callback) {
                                callback(null,that.lastSent?1:0)});
                          
                          if( this.include_video )
                              return [informationService, this.doorbellService, this.cameraService];
                          else
                              return [informationService, this.doorbellService];
                          break;
                      }
                          
                      case "Motion":
                      {
                          this.motionService = new Service.MotionSensor(this.name);
                          this.motionService
                            .getCharacteristic(Characteristic.MotionDetected)
                            .on('get', function(callback) { callback(null,!that.state)});
                          
                          return [informationService, this.motionService];
                          break;
                      }
                          
                      case "Fan":
                      {
                          this.fanService = new Service.Fan(this.name);
                          this.fanService
                            .getCharacteristic(Characteristic.On)
                            .on('get', function(callback) {callback(null,that.state)})
                            .on('set', this.setPowerState.bind(this));
                          
                          // Brightness Polling
                          if (this.brightnessHandling == "realtime" || this.brightnessHandling == "yes")
                          {
                              this.fanService
                                .addCharacteristic(new Characteristic.RotationSpeed())
                                .on('get', function(callback) {callback(null,that.currentlevel*25)})
                                .on('set', this.setBrightness.bind(this))
                                .setProps({minStep:25});
                          }
                          
                          return [informationService, this.fanService];
                          break;
                      }
                          
                      case "Security":
                      {
                          this.securityService = new Service.SecuritySystem(this.name);
                          this.securityService
                            .getCharacteristic(Characteristic.SecuritySystemCurrentState)
                            .on('get', function(callback) {callback(null,that.secCurState)});
                          
                          this.securityService
                            .getCharacteristic(Characteristic.SecuritySystemTargetState)
                            .on('get', function(callback) {callback(null,that.secTarState)})
                            .on('set', this.setSecurityState.bind(this));
                          
                          return [informationService, this.securityService];
                          break;
                      }

                      case "Keypad":
                      {
                          this.keypadService1 = new Service.StatelessProgrammableSwitch("Button 1","Button 1");
                          this.keypadService1.getCharacteristic(Characteristic.ServiceLabelIndex).on('get', function(callback) { callback(null,1) });
			  this.keypadService1.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get',function(callback) { callback(null,that.key1Val) });
			  this.keypadService1.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({minValue:0,maxValue:2});
                      
                          this.keypadService2 = new Service.StatelessProgrammableSwitch("Button 2","Button 2");
                          this.keypadService2.getCharacteristic(Characteristic.ServiceLabelIndex).on('get', function(callback) { callback(null,2) });
			  this.keypadService2.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get',function(callback) { callback(null,that.key2Val) });
			  this.keypadService2.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({minValue:0,maxValue:2});
                      
                          this.keypadService3 = new Service.StatelessProgrammableSwitch("Button 3","Button 3");
                          this.keypadService3.getCharacteristic(Characteristic.ServiceLabelIndex).on('get', function(callback) { callback(null,3) });
			  this.keypadService3.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get',function(callback) { callback(null,that.key3Val) });
			  this.keypadService3.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({minValue:0,maxValue:2});
                       
                          this.keypadService4 = new Service.StatelessProgrammableSwitch("Button 4","Button 4");
                          this.keypadService4.getCharacteristic(Characteristic.ServiceLabelIndex).on('get', function(callback) { callback(null,4) });
			  this.keypadService4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get',function(callback) { callback(null,that.key4Val) });
			  this.keypadService4.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({minValue:0,maxValue:2});
                    
                          this.keypadService5 = new Service.StatelessProgrammableSwitch("Button 5","Button 5");
                          this.keypadService5.getCharacteristic(Characteristic.ServiceLabelIndex).on('get', function(callback) { callback(null,5) });
			  this.keypadService5.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get',function(callback) { callback(null,that.key5Val) });
			  this.keypadService5.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({minValue:0,maxValue:2});
                       
                          this.keypadService6 = new Service.StatelessProgrammableSwitch("Button 6","Button 6");
                          this.keypadService6.getCharacteristic(Characteristic.ServiceLabelIndex).on('get', function(callback) { callback(null,6) });
			  this.keypadService6.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on('get',function(callback) { callback(null,that.key6Val) });
			  this.keypadService6.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps({minValue:0,maxValue:2});

                         return [informationService, this.keypadService1, this.keypadService2, this.keypadService3, this.keypadService4, this.keypadService5, this.keypadService6];
                         break;
                      }
                      case "Thermostat":
                      {
                          this.thermostatService = new Service.Thermostat(this.name);
                          this.thermostatService
                            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                            .on('get', function(callback) { that.log("Thermostat get current state: "+that.thermStatus); callback(null,that.thermStatus)});
                          
                          this.thermostatService
                            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
                            .on('get', function(callback) { that.log("Thermostat get target state: "+that.thermTarState); callback(null,that.thermTarState)})
                            .on('set', this.setThermostatTargetHeatingCoolingState.bind(this));
                          
                          this.thermostatService
                            .getCharacteristic(Characteristic.CurrentTemperature)
                            .on('get', function(callback) { that.log("Thermostat get current temp: "+that.thermCurrentTemp); callback(null,that.thermCurrentTemp)});
                          
                          this.thermostatService
                            .getCharacteristic(Characteristic.TargetTemperature)
                            .on('get', function(callback)
                                       {
                                         that.log("Thermostat get target temp "+that.thermCurState);
                                         if( that.thermTarState == Characteristic.TargetHeatingCoolingState.OFF ||
                                             that.thermTarState == Characteristic.TargetHeatingCoolingState.AUTO )
                                         {
                                                that.log("Temp from off mode");
                                                //Need to adjust the state here because HomeKit doesn't allow a current state of auto.
                                                var state = Characteristic.TargetHeatingCoolingState.OFF;
                                                if( that.thermCurrentTemp != -100 && that.thermCoolSet != -100 && that.thermHeatSet != -100 )
                                                {
                                                    var coolDiff = that.thermCurrentTemp - that.thermCoolSet;
                                                    if( coolDiff < 0 )
                                                        coolDiff = coolDiff*-1;
                                
                                                    var heatDiff = that.thermCurrentTemp - that.thermHeatSet;
                                                    if( heatDiff < 0 )
                                                        heatDiff = heatDiff*-1;
                                
                                                    if( coolDiff < heatDiff )
                                                        state = Characteristic.TargetHeatingCoolingState.COOL;
                                                    else
                                                        state = Characteristic.TargetHeatingCoolingState.HEAT;
                                                }
                                
                                                if( state == Characteristic.TargetHeatingCoolingState.COOL )
                                                {
                                                    that.log("Sending "+that.thermCoolSet);
                                                    callback(null,that.thermCoolSet);
                                                }
                                                else
                                                {
                                                    that.log("Sending "+that.thermHeatSet);
                                                    callback(null,that.thermHeatSet);
                                                }
                                         }
                                
                                         else if( that.thermTarState == Characteristic.TargetHeatingCoolingState.COOL )
                                           { that.log("Sending "+that.thermCoolSet); callback(null,that.thermCoolSet)}
                              
                                         else if( that.thermTarState == Characteristic.TargetHeatingCoolingState.HEAT )
                                           { that.log("Sending "+that.thermHeatSet); callback(null,that.thermHeatSet)}
 
                                         else { that.log("Sending "+that.thermCurrentTemp); callback(null,that.thermCurrentTemp) }
                                       })
                            .on('set', this.setThermostatTargetTemp.bind(this));
                          
                          this.thermostatService
                            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
                            .on('get', function(callback) {callback(null,that.thermDisplayUnits)})
                            .on('set', function(state,callback) { that.thermDisplayUnits = state; callback(); });
                          
                          return [informationService, this.thermostatService];
                          break;
                      }
                }
            }
};
