//
// BACnet device implementation.
// Example for using this module.
//

const BACnetDevice = require('./index.js');
const BE = require('bacstack').enum;

const dev = new BACnetDevice({
	// These parameters are all mandatory by the BACnet spec.
	deviceId: 123,
	vendorId: 0,
	name: 'Example device',
	databaseRevision: 1,
});

// Add a new data point to our device.
const objExample = dev.addObject(1, BE.ObjectType.ANALOG_INPUT, 'Example value');

// Add a property to the new data point.
const propExample = objExample.addProperty(BE.PropertyIdentifier.PRESENT_VALUE, BE.ApplicationTags.REAL);

// Set an initial value for the data point's "present value" property.
propExample.value = 1;

console.log('Dumping objects contained within this device:');

Object.keys(dev.objects).forEach(objInstance => {
	const o = dev.objects[objInstance];
	console.log(`\nObject #${o.instance}:`, o.dumpProperties());
});
