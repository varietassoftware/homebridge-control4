#DISCLAIMER

This software is neither affiliated with or endorsed by either Control4 or Apple.  

This SOFTWARE PRODUCT is provided "as is" and "with all faults." The developers make no representations
or warranties of any kind concerning the safety, suitability, lack of viruses, inaccuracies, typographical 
errors, or other harmful components of this SOFTWARE PRODUCT. There are inherent dangers in the use of any 
software, and you are solely responsible for determining whether this SOFTWARE PRODUCT is compatible with 
your equipment and other software installed on your equipment. You are also solely responsible for the 
protection of your equipment and backup of your data, and the developers will not be liable for any damages 
you may suffer in connection with using, modifying, or distributing this SOFTWARE PRODUCT. 

# Compatibility Note

In order for this plugin to function, you must have the Homebridge driver from Varietas Software installed
in your Control4 project.  The driver is currently in beta.  Contact josh@varietassoftware.com to be 
considered for beta testing.  Once the driver is released, it will be available via Houselogix.

# homebridge-control4

Supports bidirectional communication with a Control4 project on the HomeBridge Platform. Currently supports
native Control4 lights, dimmers, contact switches, garage door openers, ceiling fans (connected to switch),
fan speed controllers, motion sensors, and security systems.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install homebridge-control4 using: npm install -g homebridge-control4
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

The configuration for compatible control4 devices will be automatically output by the Varietas Software
Control4 homebridge driver.  See documentation with that driver for details.

Configuration sample:

 ```
"accessories": [ 
{
  "accessory":"Control4",
  "name":"Kitchen Lights",
  "service":"Light",
  "base_url":"http://192.168.1.201:8081/349",
  "has_level_control":"yes",
  "switchHandling":"realtime",
  "brightnessHandling":"realtime",
  "refresh_interval":2000,
  "manufacturer":"Control4",
  "model":"ldz-102-w"
}
    ]

