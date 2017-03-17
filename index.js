var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');

	module.exports = function(homebridge){
		Service = homebridge.hap.Service;
		Characteristic = homebridge.hap.Characteristic;
		homebridge.registerAccessory("homebridge-control4", "Control4", HttpAccessory);
	}


	function HttpAccessory(log, config) {
		this.log = log;

		// url info
                this.service                = config["service"] || "Switch";
                this.base_url               = config["base_url"];
                this.enable_status          = config["has_on_state"] || "yes"
                this.enable_power_control   = config["has_power_control"] || "yes";
                this.enable_level           = config["has_level_control"] || "no";
                this.invert_contact         = config["invert_contact"] || "no";

                if( this.service == "Security" || this.service == "Motion" || this.service == "Doorbell" )
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
                if( this.enable_status == "yes" )
                {              
                  if( this.service == "Light" || this.service == "Dimmer" || this.service == "Switch" || this.service == "Fan" )
		    this.status_url           = this.base_url + "/light_state";
                  else if( this.service == "Door" || this.service == "Garage Door" || this.service == "Window" ||
                           this.service == "Contact" || this.service == "Motion" || this.service == "Lock" || this.service == "Doorbell" )
                    this.status_url           = this.base_url + "/contact_state";
                  else
                    this.status_url           = this.base_url + "/status";
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

		this.http_method            = config["http_method"] 	  	 	|| "GET";;
		this.http_brightness_method = config["http_brightness_method"]  || this.http_method;
		this.username               = config["username"] 	  	 	 	|| "";
		this.password               = config["password"] 	  	 	 	|| "";
		this.sendimmediately        = config["sendimmediately"] 	 	|| "";
		this.name                   = config["name"];
                this.manufacturer           = config["manufacturer"]            || "Unknown";
                this.model                  = config["model"]                   || "Unknown";
                this.serial                 = config["serial"]                  || "Unknown";
                this.refresh_interval       = config["refresh_interval"]        || 300;
		this.brightnessHandling     = config["brightnessHandling"] 	 	|| "no";
		this.switchHandling 	    = config["switchHandling"] 		 	|| "no";
		
		//realtime polling info
		this.state = false;
                this.secTarState = 3;
                this.secCurState = 3;
		this.currentlevel = 0;
		this.enableSet = true;
		var that = this;
		
		// Status Polling, if you want to add additional services that don't use switch handling you can add something like this || (this.service=="Smoke" || this.service=="Motion"))
		if (this.status_url && this.switchHandling =="realtime") {
			var powerurl = this.status_url;
			var statusemitter = pollingtoevent(function(done) {
	        	that.httpRequest(powerurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body) {
            		if (error) {
                		that.log('HTTP get power function failed: %s', error.message);
		                return;
            		} else {               				    
						done(null, body);
            		}
        		})
			}, {longpolling:true,interval:this.refresh_interval,longpollEventName:"statuspoll"});

		statusemitter.on("statuspoll", function(data) {       
        	var binaryState = parseInt(data.replace(/\D/g,""));
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
						.setValue(that.state);
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
                                                that.garageService.getCharacteristic(Characteristic.CurrentDoorState)
                                                .setValue(that.state?Characteristic.CurrentDoorState.CLOSED:Characteristic.CurrentDoorState.OPEN);
                                                that.garageService.getCharacteristic(Characteristic.TargetDoorState)
                                                .setValue(that.state?Characteristic.TargetDoorState.CLOSED:Characteristic.TargetDoorState.OPEN);
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
                                                that.contactService.getCharacteristic(Characteristic.ContactSensorState)
                                       .setValue(that.state?Characteristic.ContactSensorState.CONTACT_DETECTED:Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
                                        }
                                        break;
                                case "Doorbell":
                                        if( that.doorbellService ) {
                                                var toSend = that.state;
                                                if( that.invert_contact == "yes" ) {
                                                  toSend = !toSend;
                                                }
                                                that.doorbellService.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                                       .setValue(toSend?1:0);
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
                                        if( that.securityService && binaryState < 10 ) {
                                                if( binaryState < 5 ) {
                                                  that.secCurState = binaryState;
                                                  that.secTarState = binaryState;
                                                } else {
                                                  that.secTarState = 0;
                                                }
                                                that.securityService.getCharacteristic(Characteristic.SecuritySystemCurrentState).
                                                setValue(that.secCurState);
                                                that.securityService.getCharacteristic(Characteristic.SecuritySystemTargetState).
                                                setValue(that.secTarState);
                                        }
                                        break;
			}
			that.enableSet = true;   
		});

	}
	// Brightness Polling
	if (this.brightnesslvl_url && this.brightnessHandling =="realtime") {
		var brightnessurl = this.brightnesslvl_url;
		var levelemitter = pollingtoevent(function(done) {
	        	that.httpRequest(brightnessurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, responseBody) {
            		if (error) {
                			that.log('HTTP get power function failed: %s', error.message);
							return;
            		} else {               				    
						done(null, responseBody);
            		}
        		}) // set longer polling as slider takes longer to set value
    	}, {longpolling:true,interval:this.refresh_interval,longpollEventName:"levelpoll"});

		levelemitter.on("levelpoll", function(data) {  
			that.currentlevel = parseInt(data);

			that.enableSet = false;
                        switch (that.service) {
                          case "Light":
                          case "Dimmer":
			    if (that.lightbulbService) {				
				that.log(that.service, "received brightness",that.brightnesslvl_url, "level is currently", that.currentlevel); 		        
				that.lightbulbService.getCharacteristic(Characteristic.Brightness)
				.setValue(that.currentlevel);
			    }
                            break;
                          case "Fan":
                            if( that.fanService ) {
                                that.log(that.service, "received fan level",that.brightnesslvl_url, "level is currently", that.currentlevel);
                                that.fanService.getCharacteristic(Characteristic.RotationSpeed)
                                .setValue(that.currentlevel*25);
                            }
                            break;
                        }   
			that.enableSet = true;
    	});
	}
	}

	HttpAccessory.prototype = {

	httpRequest: function(url, body, method, username, password, sendimmediately, callback) {
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
		function(error, response, body) {
			callback(error, response, body)
		})
	},

        setSecurityState: function(newState, callback) {

        if (this.enableSet == true) {

                var url;
                var body;

                if (!this.state_url) {
                                this.log.warn("Ignoring request; No security state url defined.");
                                callback(new Error("No security state url defined."));
                                return;
                }

                if( newState == 2 )
                  newState = 0;
         
                this.secTarState = newState;     
                url = this.state_url.replace("%s", newState);
                this.log("Setting new security state: "+url);

                this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
                        if (error) {
                        this.log('HTTP set security state function failed: %s', error.message);
                        callback(error);
                        } else {
                        this.log('HTTP set security state function succeeded!');
                        callback();
                        }
                }.bind(this));
        } else {
                callback();
        }
        },

	setPowerState: function(powerOn, callback) {
				
	if (this.enableSet == true && (this.currentlevel == 0 || !powerOn )) {
		
		var url;
		var body;
		
		if (!this.on_url || !this.off_url) {
				this.log.warn("Ignoring request; No power url defined.");
				callback(new Error("No power url defined."));
				return;
		}
		
		if (powerOn) {
			url = this.on_url;
			body = this.on_body;
			this.log("Setting power state to on");
		} else {
			url = this.off_url;
			body = this.off_body;
			this.log("Setting power state to off");
		}
		
		this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
			if (error) {
			this.log('HTTP set power function failed: %s', error.message);
			callback(error);
			} else {
			this.log('HTTP set power function succeeded!');
			callback();
			}
		}.bind(this));
	} else {
	 	callback();
	}
	},
  
  getPowerState: function(callback) {
	if (!this.status_url) {
		this.log.warn("Ignoring request; No status url defined.");
		callback(new Error("No status url defined."));
		return;
	}
	
	var url = this.status_url;
	this.log("Getting power state");
	
	this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
	if (error) {
		this.log('HTTP get power function failed: %s', error.message);
		callback(error);
	} else {
		var binaryState = parseInt(responseBody.replace(/\D/g,""));
		var powerOn = binaryState > 0;
		this.log("Power state is currently %s", binaryState);
		callback(null, powerOn);
	}
	}.bind(this));
  },

	getBrightness: function(callback) {
		if (!this.brightnesslvl_url) {
			this.log.warn("Ignoring request; No brightness level url defined.");
			callback(new Error("No brightness level url defined."));
			return;
		}		
			var url = this.brightnesslvl_url;
			this.log("Getting Brightness level");
	
			this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
			if (error) {
				this.log('HTTP get brightness function failed: %s', error.message);
				callback(error);
			} else {			
				var binaryState = parseInt(responseBody.replace(/\D/g,""));
				var level = binaryState;
				this.log("brightness state is currently %s", binaryState);
				callback(null, level);
			}
			}.bind(this));
	  },

	setBrightness: function(level, callback) {
	if (this.enableSet == true) {
		if (!this.brightness_url) {
			this.log.warn("Ignoring request; No brightness url defined.");
			callback(new Error("No brightness url defined."));
			return;
		}    
	
                if( this.service == "Fan" )
                  level = Math.round(level/25);

		var url = this.brightness_url.replace("%b", level)
	
		this.log("Setting brightness to %s", level);
	
		this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
		if (error) {
			this.log('HTTP brightness function failed: %s', error);
			callback(error);
		} else {
			this.log('HTTP brightness function succeeded!');
			callback();
		}
		}.bind(this));
	} else {
		callback();
	}
	},

	identify: function(callback) {
		this.log("Identify requested!");
		callback(); // success
	},

	getServices: function() {
		
		var that = this;
		
		// you can OPTIONALLY create an information service if you wish to override
		// the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();
	
		informationService
		.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
		.setCharacteristic(Characteristic.Model, this.model)
		.setCharacteristic(Characteristic.SerialNumber, this.serial);
	
		switch (this.service) {
		case "Switch": 
			this.switchService = new Service.Switch(this.name);
			switch (this.switchHandling) {	
				//Power Polling			
				case "yes":					
                                case "realtime":
					this.switchService
					.getCharacteristic(Characteristic.On)
					.on('get', this.getPowerState.bind(this))
					.on('set', this.setPowerState.bind(this));						
					break;
				default	:	
					this.switchService
					.getCharacteristic(Characteristic.On)	
					.on('set', this.setPowerState.bind(this));					
					break;}
					return [this.switchService];
		case "Light":	
                case "Dimmer":
			this.lightbulbService = new Service.Lightbulb(this.name);			
			switch (this.switchHandling) {
			//Power Polling
			case "yes" :
                        case "realtime" :
				this.lightbulbService
				.getCharacteristic(Characteristic.On)
				.on('get', this.getPowerState.bind(this))
				.on('set', this.setPowerState.bind(this));
				break;
			default:		
				this.lightbulbService
				.getCharacteristic(Characteristic.On)	
				.on('set', this.setPowerState.bind(this));
				break;
			}
			// Brightness Polling 
			if (this.brightnessHandling == "realtime" || this.brightnessHandling == "yes") {
				this.lightbulbService
				.addCharacteristic(new Characteristic.Brightness())
				.on('get', this.getBrightness.bind(this))
				.on('set', this.setBrightness.bind(this));							
			}
	
			return [informationService, this.lightbulbService];
			break;		
                case "Door":
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
                case "Window":
                        this.windowService = new Service.Window(this.name);
                        this.windowService
                        .getCharacteristic(Characteristic.CurrentPosition)
                        .on('get', function(callback) {callback(null,that.state?0:100)});
                        this.windowService
                        .getCharacteristic(Characteristic.TargetPosition)
                        .on('get', this.getPowerState.bind(this))
                        .on('set', this.setPowerState.bind(this));
                        this.windowService
                        .getCharacteristic(Characteristic.PositionState)
                        .on('get', function(callback) {callback(null,2)});
                        return [informationService, this.windowService];
                        break;
                case "Garage Door":
                        this.garageService = new Service.GarageDoorOpener(this.name);
                        this.garageService
                        .getCharacteristic(Characteristic.CurrentDoorState)
                        .on('get', function(callback) {callback(null,that.state?Characteristic.CurrentDoorState.CLOSED:Characteristic.CurrentDoorState.OPEN)});
                        this.garageService
                        .getCharacteristic(Characteristic.TargetDoorState)
                        .on('get', this.getPowerState.bind(this))
                        .on('set', this.setPowerState.bind(this));
                        this.garageService
                        .getCharacteristic(Characteristic.ObstructionDetected)
                        .on('get', function(callback) {callback(null,false)});
                        return [informationService, this.garageService];
                        break;
                case "Lock":
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
                case "Contact":
                        this.contactService = new Service.ContactSensor(this.name);
                        this.contactService
                        .getCharacteristic(Characteristic.ContactSensorState)
                        .on('get', function(callback) {
                            callback(null,that.state?Characteristic.ContactSensorState.CONTACT_DETECTED:Characteristic.ContactSensorState.CONTACT_NOT_DETECTED)
                                                      });
                        return [informationService, this.contactService];
                        break;
                case "Doorbell":
                        this.cameraService = new Service.CameraRTPStreamManagement(this.name);
                        this.doorbellService = new Service.Doorbell(this.name);
                        this.doorbellService
                        .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                        .on('get', function(callback) {
                            var toSend = that.state;
                            if( that.invert_contact ) {
                              toSend = !toSend;
                            }
                            callback(null,toSend?1:0)});
                        return [informationService, this.doorbellService, this.cameraService];
                        break;
                case "Motion":
                        this.motionService = new Service.MotionSensor(this.name);
                        this.motionService
                        .getCharacteristic(Characteristic.MotionDetected)
                        .on('get', function(callback) { callback(null,!that.state)});
                        return [informationService, this.motionService];
                        break;
                case "Fan":
                        this.fanService = new Service.Fan(this.name);
                        this.fanService
                        .getCharacteristic(Characteristic.On)
                        .on('get', this.getPowerState.bind(this))
                        .on('set', this.setPowerState.bind(this));
                        // Brightness Polling
                        if (this.brightnessHandling == "realtime" || this.brightnessHandling == "yes") {
                                this.fanService
                                .addCharacteristic(new Characteristic.RotationSpeed())
                                .on('get', this.getBrightness.bind(this))
                                .on('set', this.setBrightness.bind(this))
                                .setProps({minStep:25});
                        }
                        return [informationService, this.fanService];
                        break;
                case "Security":
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
	}
};
